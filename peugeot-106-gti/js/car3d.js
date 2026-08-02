import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

const MODEL_URL = "./assets/peugeot-106-gti.glb";
const WHEEL_TAGS = ["FR", "FL", "RR", "RL"];

let templatePromise = null;
function loadTemplate() {
  if (!templatePromise) {
    templatePromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(MODEL_URL, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
  return templatePromise;
}

// Blender-modellenmiş gerçek Peugeot 106 GTI GLB'sini yükler, her çağrıda
// bağımsız boyanabilir/döndürülebilir bir kopyasını döndürür.
export async function createCarGroup(hex) {
  const template = await loadTemplate();
  const group = template.clone(true);
  group.updateMatrixWorld(true);

  const bodyMats = [];
  const wheelParts = { FR: [], FL: [], RR: [], RL: [] };

  group.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.material = obj.material.clone();
    if (obj.material.name === "GTI_Red") bodyMats.push(obj.material);
    for (const tag of WHEEL_TAGS) {
      if (obj.name.startsWith(`Wheel_${tag}_`)) wheelParts[tag].push(obj);
    }
  });
  bodyMats.forEach((m) => m.color.set(hex));

  const wheels = WHEEL_TAGS.map((tag) => {
    const parts = wheelParts[tag];
    const pivot = new THREE.Group();
    if (parts.length) {
      const pos = new THREE.Vector3();
      parts[0].getWorldPosition(pos);
      pivot.position.copy(pos);
      group.add(pivot);
      parts.forEach((p) => pivot.attach(p));
    } else {
      group.add(pivot);
    }
    return pivot;
  });

  group.userData.setColor = (newHex) => bodyMats.forEach((m) => m.color.set(newHex));
  group.userData.wheels = wheels;
  return group;
}
