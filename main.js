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
    gl_FragColor = vec4(pos, 1);
  }
`

let res = 150;
let geometry = new THREE.BoxGeometry(3, 3, 3, res, res, res);

let material = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    vTime: {value: 1.0}
  },
  wireframe: true
});

for (let i = 0; i < geometry.attributes.position.count; i++){
  const vertex = new THREE.Vector3();
  vertex.fromBufferAttribute(geometry.attributes.position, i);
  vertex.normalize().multiplyScalar(2);
  geometry.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
}

let mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

function createCrater(geometry, center, radius, depth){
  const meshData = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < meshData.count; i++){
    vertex.fromBufferAttribute(meshData, i);
    const distToCenter = vertex.distanceTo(center);

    if (distToCenter <= radius){
      const influence = -depth * Math.exp(-Math.pow(distToCenter, 2) / (radius * radius));
      const normal = vertex.clone().normalize().multiplyScalar(2);
      vertex.addScaledVector(normal, influence);
      meshData.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }

  meshData.needsUpdate = true;
  geometry.computeVertexNormals();
}

createCrater(geometry, new THREE.Vector3(0.3, 0.5, 0.2).normalize().multiplyScalar(2), 0.3, 0.1);



//GUI Sliders
const gui = new dat.GUI();
const settings = {
  wireframe: true,
  res: 3,
  sin: 0.1
};

gui.add(settings, 'wireframe').onChange(value => {
  material.wireframe = value;
});

gui.add(settings, "res", 1, 30).onChange(value => {
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

gui.add(settings, 'sin', 0, 30).onChange(value => {
  material.uniforms.vTime.value = value;
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
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += .5;
  // Required if controls.enableDamping or controls.autoRotate are set to true
  controls.update();
  material.uniforms.time = time;
  onWindowResize()
  renderer.render(scene, camera);
}
animate();