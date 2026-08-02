import * as THREE from "./vendor/three.module.min.js";

// Araç ileri yönü +X, sağ/sol +/-Z, yukarı +Y.
export function createCarGroup(hex) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, metalness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd0ff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.82 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.8 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.4, metalness: 0.6 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffe27a, emissiveIntensity: 0.7 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xd81c2c, emissiveIntensity: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(34, 9, 17), bodyMat);
  body.position.set(0, 6.5, 0);
  group.add(body);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 16), bodyMat);
  nose.position.set(19, 6, 0);
  group.add(nose);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 15), bodyMat);
  cabin.position.set(-2, 12, 0);
  group.add(cabin);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(15.4, 5.6, 15.6), glassMat);
  windshield.position.set(-2, 12, 0);
  group.add(windshield);

  const wheelGeo = new THREE.CylinderGeometry(5.2, 5.2, 5.4, 18);
  wheelGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(2.6, 2.6, 5.6, 10);
  rimGeo.rotateX(Math.PI / 2);
  const wheelPositions = [
    [11.5, 5.2, 9.4],
    [11.5, 5.2, -9.4],
    [-11.5, 5.2, 9.4],
    [-11.5, 5.2, -9.4],
  ];
  const wheels = wheelPositions.map((p) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, darkMat);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    w.add(tire, rim);
    w.position.set(...p);
    group.add(w);
    return w;
  });

  const headL = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4), headMat);
  headL.position.set(23, 7, 5.5);
  group.add(headL);
  const headR = headL.clone();
  headR.position.z = -5.5;
  group.add(headR);

  const tailL = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4), tailMat);
  tailL.position.set(-17, 7, 6.5);
  group.add(tailL);
  const tailR = tailL.clone();
  tailR.position.z = -6.5;
  group.add(tailR);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(22, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);

  group.userData.setColor = (newHex) => bodyMat.color.set(newHex);
  group.userData.wheels = wheels;
  return group;
}
