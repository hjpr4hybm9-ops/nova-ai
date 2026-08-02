import * as THREE from "./vendor/three.module.min.js";

// Araç ileri yönü +X, sağ/sol +/-Z, yukarı +Y.
// Gövde, X ekseni boyunca sıralanmış dikdörtgen kesitlerin (ring) birbirine
// bağlanmasıyla (loft) oluşturulur — her kesit kaput/ön cam/tavan/arka cam
// hattını temsil eden ayrı genişlik+yükseklik değerlerine sahiptir, bu da
// kutulardan çok daha akıcı ama hâlâ öngörülebilir bir 106 GTI silueti verir.
const BODY_RINGS = [
  { x: -16.5, hw: 8.0, y0: 2.0, y1: 6.5 }, // arka tampon ucu
  { x: -15.0, hw: 9.6, y0: 1.3, y1: 9.0 }, // arka çamurluk / bagaj kapağı alt
  { x: -12.0, hw: 10.0, y0: 1.0, y1: 15.5 }, // C sütunu / bagaj kapağı üst
  { x: -8.0, hw: 10.0, y0: 1.0, y1: 19.0 }, // tavan arka
  { x: 2.0, hw: 10.0, y0: 1.0, y1: 19.0 }, // tavan ön
  { x: 6.0, hw: 10.0, y0: 1.0, y1: 11.5 }, // ön cam alt / kaput birleşimi
  { x: 12.0, hw: 9.7, y0: 1.3, y1: 9.8 }, // kaput
  { x: 16.0, hw: 8.6, y0: 1.6, y1: 7.0 }, // ön çamurluk
  { x: 17.0, hw: 8.0, y0: 1.8, y1: 6.3 }, // ön tampon ucu
];

function buildBodyGeometry(rings = BODY_RINGS) {
  const positions = [];
  const indices = [];
  const cornersOf = (r) => [
    [r.x, r.y0, -r.hw],
    [r.x, r.y0, r.hw],
    [r.x, r.y1, r.hw],
    [r.x, r.y1, -r.hw],
  ];
  rings.forEach((r) => cornersOf(r).forEach((p) => positions.push(...p)));

  const n = rings.length;
  for (let i = 0; i < n - 1; i++) {
    const base = i * 4, next = (i + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const a = base + k, b = base + ((k + 1) % 4), c = next + ((k + 1) % 4), d = next + k;
      indices.push(a, b, c, a, c, d);
    }
  }
  const lastBase = (n - 1) * 4;
  indices.push(lastBase, lastBase + 1, lastBase + 2, lastBase, lastBase + 2, lastBase + 3);
  indices.push(0, 2, 1, 0, 3, 2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// PlaneGeometry'yi verilen yönde (world eksenlerine göre) sabitler.
function glassPane(w, h, rakeDeg, faceUp = true) {
  const geo = new THREE.PlaneGeometry(w, h);
  geo.rotateY(Math.PI / 2); // genişlik ekseni -> Z, normal -> +X
  geo.rotateZ(THREE.MathUtils.degToRad(rakeDeg));
  if (!faceUp) geo.rotateX(Math.PI);
  return geo;
}

// Yazı/logo dekalları için küçük bir canvas dokusu üretir.
function textTexture(text, { w = 512, h = 128, font = "700 64px Arial, sans-serif", color = "#eef1f6", bg = null } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 2);
  return new THREE.CanvasTexture(canvas);
}

// Aracın arkasına (-X) veya önüne (+X) bakan düz bir dekal panosu.
function decalPane(w, h, texture, facingForward) {
  const geo = new THREE.PlaneGeometry(w, h);
  geo.rotateY(facingForward ? Math.PI / 2 : -Math.PI / 2);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
}

export function createCarGroup(hex) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0.4, flatShading: true });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x8fb8d8, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.75 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.5, metalness: 0.2 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe9edf3, roughness: 0.25, metalness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfaf6e8, emissive: 0xfff2c4, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.1 });
  const indicatorMat = new THREE.MeshStandardMaterial({ color: 0xffb23e, emissive: 0xff9500, emissiveIntensity: 0.6 });
  const tailUpperMat = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.3 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xd81c2c, emissiveIntensity: 0.7 });
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.5 });

  // --- Gövde kabuğu ---
  const body = new THREE.Mesh(buildBodyGeometry(), bodyMat);
  body.material.side = THREE.DoubleSide;
  group.add(body);

  // --- Camlar (kabin boşluğuna oturan düz panolar) ---
  const windshield = new THREE.Mesh(glassPane(19.4, 8.5, 28), glassMat);
  windshield.position.set(4, 15.2, 0);
  group.add(windshield);

  const rearGlass = new THREE.Mesh(glassPane(19.4, 7.2, -24.8), glassMat);
  rearGlass.position.set(-13.5, 12.2, 0);
  group.add(rearGlass);

  const sideGlassGeoR = new THREE.PlaneGeometry(17.5, 7.2);
  const sideGlassR = new THREE.Mesh(sideGlassGeoR, glassMat);
  sideGlassR.position.set(-3, 15, 9.85);
  group.add(sideGlassR);
  const sideGlassL = sideGlassR.clone();
  sideGlassL.rotation.y = Math.PI;
  sideGlassL.position.z = -9.85;
  group.add(sideGlassL);

  // --- Çatı / ön cam siyah çıtası ---
  const roofBar = new THREE.Mesh(new THREE.BoxGeometry(10.2, 1, 19.8), trimMat);
  roofBar.position.set(-3, 19.1, 0);
  group.add(roofBar);

  // --- Ön ve arka tampon alt (siyah) valans ---
  const frontValance = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.2, 17.4), trimMat);
  frontValance.position.set(16.3, 3.1, 0);
  group.add(frontValance);
  const frontLip = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 17.6), darkMat);
  frontLip.position.set(17.3, 1.3, 0);
  group.add(frontLip);

  const rearValance = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 16.4), trimMat);
  rearValance.position.set(-16, 3, 0);
  group.add(rearValance);

  // --- Izgara + Peugeot arslan rozeti ---
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 9), darkMat);
  grille.position.set(17.4, 6.3, 0);
  group.add(grille);
  const badgeTex = textTexture("P", { w: 128, h: 128, font: "700 84px Georgia", color: "#e9edf3" });
  const frontBadge = decalPane(2.2, 2.2, badgeTex, true);
  frontBadge.position.set(17.55, 6.3, 0);
  group.add(frontBadge);

  // --- Sis farları ---
  [7.2, -7.2].forEach((z) => {
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.4, 12), darkMat);
    fog.rotation.z = Math.PI / 2;
    fog.position.set(17, 2.9, z);
    group.add(fog);
    const fogLens = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 12), headMat);
    fogLens.rotation.z = Math.PI / 2;
    fogLens.position.set(17.6, 2.9, z);
    group.add(fogLens);
  });

  // --- Farlar (yatık/süpürülmüş, iç köşede turuncu sinyal) ---
  [1, -1].forEach((side) => {
    const head = new THREE.Group();
    const lens = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3, 4.4), headMat);
    head.add(lens);
    const ind = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1.4), indicatorMat);
    ind.position.set(0.1, -1.3, 1.8 * side);
    head.add(ind);
    head.rotation.y = -0.22 * side;
    head.position.set(16.7, 6.8, 6.4 * side);
    group.add(head);
  });

  // --- Arka lambalar (üstte krem, altta kırmızı — köşeye sarılan) ---
  [1, -1].forEach((side) => {
    const tail = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 3.6), tailUpperMat);
    upper.position.set(0, 1.3, 0);
    tail.add(upper);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2, 2.6, 3.6), tailMat);
    lower.position.set(0, -0.6, 0);
    tail.add(lower);
    tail.rotation.y = 0.18 * side;
    tail.position.set(-15.8, 7.6, 7.3 * side);
    group.add(tail);
  });

  // --- Arka plaka + Peugeot / GTI yazıları ---
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 4.4), plateMat);
  plate.position.set(-17.6, 3.4, 0);
  group.add(plate);
  const plateTex = textTexture("106 GTI", { w: 480, h: 128, font: "700 66px Arial", color: "#101318" });
  group.add(decalPane(3.9, 1.1, plateTex, false).translateX(-17.71).translateY(3.4));

  const peugeotTex = textTexture("PEUGEOT", { w: 512, h: 96, font: "700 54px Arial", color: "#f2f4f8" });
  group.add(decalPane(6.2, 0.9, peugeotTex, false).translateX(-16.62).translateY(5.6));

  const gtiTex = textTexture("GTI", { w: 220, h: 128, font: "800 88px Arial", color: "#ffffff", bg: "#d81c2c" });
  const gtiBadge = decalPane(1.7, 1, gtiTex, false);
  gtiBadge.position.set(-16.62, 8, 0);
  group.add(gtiBadge);

  // --- Arka spoiler (siyah, üçüncü fren lambalı) ---
  const spoilerBase = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 18), trimMat);
  spoilerBase.position.set(-12, 16.6, 0);
  group.add(spoilerBase);
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 18.6), darkMat);
  spoilerWing.position.set(-12.4, 17.5, 0);
  group.add(spoilerWing);
  const brakeLight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 10), tailMat);
  brakeLight.position.set(-13.9, 17.5, 0);
  group.add(brakeLight);

  // --- Yan marşpiyeller / eşikler (siyah) ---
  const skirtR = new THREE.Mesh(new THREE.BoxGeometry(24, 1.6, 0.7), trimMat);
  skirtR.position.set(0, 1.5, 10.9);
  group.add(skirtR);
  const skirtL = skirtR.clone();
  skirtL.position.z = -10.9;
  group.add(skirtL);

  // --- Ön çamurluk üzerindeki GTI rozeti (dışa, yanlara bakar) ---
  const fenderBadgeTex = textTexture("GTI", { w: 220, h: 100, font: "700 56px Arial", color: "#d81c2c", bg: "#f2f4f8" });
  const fenderBadgeGeoR = new THREE.PlaneGeometry(1.6, 0.75); // varsayılan normal +Z
  const fenderBadgeR = new THREE.Mesh(fenderBadgeGeoR, new THREE.MeshBasicMaterial({ map: fenderBadgeTex, transparent: true, depthWrite: false }));
  fenderBadgeR.position.set(9.6, 8.4, 10.05);
  group.add(fenderBadgeR);
  const fenderBadgeL = fenderBadgeR.clone();
  fenderBadgeL.rotation.y = Math.PI; // normal -Z
  fenderBadgeL.position.z = -10.05;
  group.add(fenderBadgeL);

  // --- Dış dikiz aynaları ---
  const mirrorGeo = new THREE.BoxGeometry(1.6, 1.4, 2.4);
  const mirrorR = new THREE.Mesh(mirrorGeo, darkMat);
  mirrorR.position.set(6.5, 13, 10.2);
  group.add(mirrorR);
  const mirrorL = mirrorR.clone();
  mirrorL.position.z = -10.2;
  group.add(mirrorL);

  // --- Egzoz ucu ---
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.4, 12), rimMat);
  exhaust.rotation.z = Math.PI / 2;
  exhaust.position.set(-16.6, 2.2, 6.5);
  group.add(exhaust);

  // --- Tekerlekler (5 kollu jant görünümü) ---
  const tireGeo = new THREE.CylinderGeometry(4.3, 4.3, 4.8, 20);
  tireGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(2.7, 2.7, 5, 16);
  rimGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.8, 0.8, 5.2, 10);
  hubGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.8, 4.6, 4.9);

  const wheelPositions = [
    [11.5, 4.3, 9.4],
    [11.5, 4.3, -9.4],
    [-11.5, 4.3, 9.4],
    [-11.5, 4.3, -9.4],
  ];
  const wheels = wheelPositions.map((p) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, darkMat);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    const hub = new THREE.Mesh(hubGeo, darkMat);
    w.add(tire, rim, hub);
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.rotation.x = (i / 5) * Math.PI * 2;
      w.add(spoke);
    }
    w.position.set(...p);
    group.add(w);
    return w;
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(23, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);

  group.userData.setColor = (newHex) => bodyMat.color.set(newHex);
  group.userData.wheels = wheels;
  return group;
}
