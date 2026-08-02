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

export function createCarGroup(hex) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0.4, flatShading: true });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x8fb8d8, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.75 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.5, metalness: 0.2 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcdd3dc, roughness: 0.3, metalness: 0.75 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffe27a, emissiveIntensity: 0.7 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xd81c2c, emissiveIntensity: 0.7 });
  const gtiMat = new THREE.MeshStandardMaterial({ color: 0xd81c2c, roughness: 0.5 });

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

  // --- Çatı kenar çıtası ---
  const roofBar = new THREE.Mesh(new THREE.BoxGeometry(10.2, 1, 19.8), bodyMat);
  roofBar.position.set(-3, 19.1, 0);
  group.add(roofBar);

  // --- Ön tampon alt dudak / spoiler ---
  const frontLip = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.6, 19.5), trimMat);
  frontLip.position.set(17.2, 1.6, 0);
  group.add(frontLip);

  // --- Izgara ---
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.6, 10), trimMat);
  grille.position.set(17.4, 6.5, 0);
  group.add(grille);

  // --- Sis farları ---
  [7.2, -7.2].forEach((z) => {
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.4, 12), headMat);
    fog.rotation.z = Math.PI / 2;
    fog.position.set(17, 3.4, z);
    group.add(fog);
  });

  // --- Farlar (ön/arka) ---
  const headL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 5), headMat);
  headL.position.set(16.6, 6.8, 6.6);
  group.add(headL);
  const headR = headL.clone();
  headR.position.z = -6.6;
  group.add(headR);

  const tailL = new THREE.Mesh(new THREE.BoxGeometry(2, 3.6, 3.4), tailMat);
  tailL.position.set(-15.7, 7.2, 7.4);
  group.add(tailL);
  const tailR = tailL.clone();
  tailR.position.z = -7.4;
  group.add(tailR);

  // --- Arka spoiler (GTI'nin karakteristik çatı spoyleri) ---
  const spoilerBase = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 18), bodyMat);
  spoilerBase.position.set(-12, 16.6, 0);
  group.add(spoilerBase);
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 18.6), darkMat);
  spoilerWing.position.set(-12.4, 17.5, 0);
  group.add(spoilerWing);

  // --- Yan marşpiyeller / eşikler ---
  const skirtR = new THREE.Mesh(new THREE.BoxGeometry(24, 1.4, 0.6), trimMat);
  skirtR.position.set(0, 1.6, 10.9);
  group.add(skirtR);
  const skirtL = skirtR.clone();
  skirtL.position.z = -10.9;
  group.add(skirtL);

  // --- GTI şeridi (eşik üstü ince kırmızı çizgi) ---
  const stripeR = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 0.15), gtiMat);
  stripeR.position.set(0, 4.2, 11.05);
  group.add(stripeR);
  const stripeL = stripeR.clone();
  stripeL.position.z = -11.05;
  group.add(stripeL);

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
