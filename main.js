import './style.css'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import * as dat from 'dat.gui';

// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 2, 4);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const vertexShader = /*glsl*/`
  uniform float vTime;
  varying vec3 pos;

  void main(){
    vec3 displaced = position;
    pos = displaced;

    vec4 modelViewPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`

const fragmentShader = /*glsl*/`
  varying vec3 pos;

  void main() {
    gl_FragColor = vec4(0.5, 0.3, 0.2, 1);
  }
`

let res = 80;
let geometry = new THREE.BoxGeometry(3, 3, 3, res, res, res);

let material = new THREE.MeshStandardMaterial({
  wireframe: true,
  color: 0xffffff  
});

for (let i = 0; i < geometry.attributes.position.count; i++){
  const vertex = new THREE.Vector3();
  vertex.fromBufferAttribute(geometry.attributes.position, i);
  vertex.normalize().multiplyScalar(5);
  geometry.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
}

let mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const dl = new THREE.DirectionalLight(0xffffff, 3); 
dl.position.set(5, 5, 5); 
scene.add(dl);
const pointLightHelper = new THREE.DirectionalLightHelper(dl, 3);
scene.add(pointLightHelper);

function smoothMin(a, b, k) {
  const h = Math.max(0.0, Math.min(1.0, 0.5 + 0.5 * (b - a) / k));
  return a * h + b * (1.0 - h) - k * h * (1.0 - h);
}
function createCrater(geometry, center, radius, depth) {
  const pos = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  const rimWidth = radius * 0.4;
  const rimHeight = depth * 0.6;
  const craterFloorDepth = depth;
  const blendStrength = depth;

  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    const dist = vertex.distanceTo(center);
    const norm = vertex.clone().normalize();

    const t = dist / radius;
    
    // Crater bowl: an inverted parabola that flattens at center
    let bowl = -craterFloorDepth * (1 - t * t); // deeper toward center
    if (t > 1) bowl = 0; // outside crater

    // Rim: raised ring around edge
    const rimT = (dist - radius) / rimWidth;
    let rim = rimHeight * (1 - rimT * rimT);
    if (rimT < 0 || rimT > 1) rim = 0;

    // Combine crater shape: take the max between bowl and rim
    let craterShape = smoothMin(bowl, rim, blendStrength);


    // Smooth transitions using interpolation blend
    // (optional advanced: use smoothstep for smoother edge blending)

    // Apply to mesh
    vertex.addScaledVector(norm, craterShape);
    pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}




for (let i = 0; i < 30; i++) {
  const pos = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  ).normalize().multiplyScalar(5);

  const radius = 0.1 + Math.random() * 0.6; // radius: 0.6 - 1.2
  const depth = 0.1 + Math.random() * 0.3;  // depth: 0.3 - 0.7

  createCrater(geometry, pos, radius, depth);
}





//GUI Sliders
const gui = new dat.GUI();
const settings = {
  wireframe: true,
  res: 300,
  craterDepth: 0.3,
  craterRadius: 0.2
};

gui.add(settings, 'wireframe').onChange(value => {
  material.wireframe = value;
});

gui.add(settings, "res", 100, 300).onChange(value => {
  geometry.heightSegments = value;
  geometry.widthSegments = value;
  geometry.lengthSegments = value;

  scene.remove(mesh);
  geometry.dispose();

  // Create new geometry with new resolution
  const newGeometry = new THREE.BoxGeometry(3, 3, 3, value, value, value);

  for (let i = 0; i < newGeometry.attributes.position.count; i++) {
    const vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(newGeometry.attributes.position, i);
    vertex.normalize().multiplyScalar(2);
    newGeometry.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  // Assign new geometry
  mesh = new THREE.Mesh(newGeometry, material);
  geometry = newGeometry; // update reference so we can dispose it again later
  scene.add(mesh);
})

gui.add(settings, "craterDepth", 0.01, 0.3).onChange(value => {
  scene.remove(mesh);
  geometry.dispose();
  const newGeometry = new THREE.BoxGeometry(3, 3, 3, res, res, res);

  for (let i = 0; i < newGeometry.attributes.position.count; i++) {
    const vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(newGeometry.attributes.position, i);
    vertex.normalize().multiplyScalar(2);
    newGeometry.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  // Assign new geometry
  mesh = new THREE.Mesh(newGeometry, material);
  geometry = newGeometry; // update reference so we can dispose it again later
  scene.add(mesh);
  depth = value;
  createCrater(geometry, new THREE.Vector3(0.3, 0.5, 0.2).normalize().multiplyScalar(2), radius, depth);
})

gui.add(settings, "craterRadius", 0.01, 1).onChange(value => {
  scene.remove(mesh);
  geometry.dispose();
  const newGeometry = new THREE.BoxGeometry(3, 3, 3, res, res, res);

  for (let i = 0; i < newGeometry.attributes.position.count; i++) {
    const vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(newGeometry.attributes.position, i);
    vertex.normalize().multiplyScalar(2);
    newGeometry.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  // Assign new geometry
  mesh = new THREE.Mesh(newGeometry, material);
  geometry = newGeometry; // update reference so we can dispose it again later
  scene.add(mesh);
  radius = value;
  createCrater(geometry, new THREE.Vector3(0.3, 0.5, 0.2).normalize().multiplyScalar(2), radius, depth);
})

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}

//Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 1; 

// Render the scene
function animate() {
  requestAnimationFrame(animate);
  // Required if controls.enableDamping or controls.autoRotate are set to true
  controls.update();
  onWindowResize()
  //mesh.rotation.y += 0.002;
  renderer.render(scene, camera);
}
animate();