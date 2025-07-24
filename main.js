import './style.css'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import * as dat from 'dat.gui';

// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(100, 100, 4);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const snoise = document.getElementById("snoise").innerHTML;
const vertexShader = /*glsl*/`  
  attribute vec3 tangent;

  uniform int type;
  uniform float radius;
  uniform float amplitude;
  uniform float sharpness;
  uniform float offset;
  uniform float period;
  uniform float persistence;
  uniform float lacunarity;
  uniform int octaves;

  varying vec3 fragPosition;
  varying vec3 fragNormal;
  varying vec3 fragTangent;
  varying vec3 fragBitangent;

  void main(){
    float terrain = terrainHeight(type, position, amplitude, sharpness, offset, period, persistence, lacunarity, octaves);

    vec3 pos = position * (radius + terrain);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    fragPosition = position;
    fragNormal = normal;
    fragTangent = tangent;
    fragBitangent = cross(normal, tangent);
  }
`

const fragmentShader = /*glsl*/`
  varying vec3 pos;

  uniform int type;
  uniform float radius;
  uniform float amplitude;
  uniform float sharpness;
  uniform float offset;
  uniform float period;
  uniform float persistence;
  uniform float lacunarity;
  uniform int octaves;

  // Layer colors
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  uniform vec3 color4;
  uniform vec3 color5;
  
  // Transition points for each layer
  uniform float transition2;
  uniform float transition3;
  uniform float transition4;
  uniform float transition5;

  // Amount of blending between each layer
  uniform float blend12;
  uniform float blend23;
  uniform float blend34;
  uniform float blend45;

  // Bump mapping parameters
  uniform float bumpStrength;
  uniform float bumpOffset;

  // Lighting parameters
  uniform float ambientIntensity;
  uniform float diffuseIntensity;
  uniform float specularIntensity;
  uniform float shininess;
  uniform vec3 lightDirection;
  uniform vec3 lightColor;

  varying vec3 fragPosition;
  varying vec3 fragNormal;
  varying vec3 fragTangent;
  varying vec3 fragBitangent;

  void main(){
    float h = terrainHeight(
      type,
      fragPosition,
      amplitude, 
      sharpness,
      offset,
      period, 
      persistence, 
      lacunarity, 
      octaves);

    vec3 dx = bumpOffset * fragTangent;
    float h_dx = terrainHeight(
      type,
      fragPosition + dx,
      amplitude, 
      sharpness,
      offset,
      period, 
      persistence, 
      lacunarity, 
      octaves);

    vec3 dy = bumpOffset * fragBitangent;
    float h_dy = terrainHeight(
      type,
      fragPosition + dy,
      amplitude, 
      sharpness,
      offset,
      period, 
      persistence, 
      lacunarity, 
      octaves);

    vec3 pos = fragPosition * (radius + h);
    vec3 pos_dx = (fragPosition + dx) * (radius + h_dx);
    vec3 pos_dy = (fragPosition + dy) * (radius + h_dy);

    // Recalculate surface normal post-bump mapping
    vec3 bumpNormal = normalize(cross(pos_dx - pos, pos_dy - pos));
    // Mix original normal and bumped normal to control bump strength
    vec3 N = normalize(mix(fragNormal, bumpNormal, bumpStrength));
  
    // Normalized light direction (points in direction that light travels)
    vec3 L = normalize(-lightDirection);
    // View vector from camera to fragment
    vec3 V = normalize(cameraPosition - pos);
    // Reflected light vector
    vec3 R = normalize(reflect(L, N));

    float diffuse = diffuseIntensity * max(0.0, dot(N, -L));

    // https://ogldev.org/www/tutorial19/tutorial19.html
    float specularFalloff = clamp((transition3 - h) / transition3, 0.0, 1.0);
    float specular = max(0.0, specularFalloff * specularIntensity * pow(dot(V, R), shininess));

    float light = ambientIntensity + diffuse + specular;

    // Blender colors layer by layer
    vec3 color12 = mix(
      color1, 
      color2, 
      smoothstep(transition2 - blend12, transition2 + blend12, h));

    vec3 color123 = mix(
      color12, 
      color3, 
      smoothstep(transition3 - blend23, transition3 + blend23, h));

    vec3 color1234 = mix(
      color123, 
      color4, 
      smoothstep(transition4 - blend34, transition4 + blend34, h));

    vec3 finalColor = mix(
      color1234, 
      color5, 
      smoothstep(transition5 - blend45, transition5 + blend45, h));
    
    gl_FragColor = vec4(light * finalColor * lightColor, 1.0);
  }
`

let res = 80;
let geometry = new THREE.SphereGeometry(5, res, res);
let material = new THREE.ShaderMaterial({
  wireframe: true,
  vertexShader: vertexShader.replace("void main(){", `${snoise}
    void main(){`),
  fragmentShader: fragmentShader.replace("void main(){", `${snoise}
    void main(){`),
  uniforms: {
    type: {value: 2},
    radius: { value: 15.0 },
    amplitude: { value: 1.2 },
    sharpness: { value: 1.6 },
    offset: { value: -0.016 },
    period: { value: 3.2 },
    persistence: { value: 0.484 },
    lacunarity: { value: 1.5 },
    octaves: { value: 10 },
    undulation: { value: 0.0 },
    ambientIntensity: { value: 0.42 },
    diffuseIntensity: { value: 1.3 },
    specularIntensity: { value: 2 },
    shininess: { value: 3 },
    lightDirection: { value: new THREE.Vector3(1, 1, 1) },
    lightColor: { value: new THREE.Color(0xffffff) },
    bumpStrength: { value: 1.0 },
    bumpOffset: { value: 0.001 },
    color1: { value: new THREE.Color(0.014, 0.117, 0.279) },
    color2: { value: new THREE.Color(0.080, 0.527, 0.351) },
    color3: { value: new THREE.Color(0.620, 0.516, 0.372) },
    color4: { value: new THREE.Color(0.149, 0.254, 0.084) },
    color5: { value: new THREE.Color(0.150, 0.150, 0.150) },
    transition2: { value: 0.071 },
    transition3: { value: 0.215 },
    transition4: { value: 0.372 },
    transition5: { value: 1.2 },
    blend12: { value: 0.152 },
    blend23: { value: 0.152 },
    blend34: { value: 0.104 },
    blend45: { value: 0.168 }
  }
});

let mesh = new THREE.Mesh(geometry, material);
mesh.geometry.computeTangents();
scene.add(mesh);

const dl = new THREE.DirectionalLight(0xffffff, 3); 
dl.position.set(5, 5, 5); 
scene.add(dl);
const pointLightHelper = new THREE.DirectionalLightHelper(dl, 3);
scene.add(pointLightHelper);

let atmGeo = new THREE.SphereGeometry(130, res, res);
let atmMat = new THREE.ShaderMaterial({
  wireframe: false,
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normalize( normalMatrix * normal );
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );  
    }
  `,
  fragmentShader: `
    uniform vec3 camPos;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      float intensity = pow( 0.7 - dot( vNormal, vec3(0.0,0.0,1.0) ), 8.0 );
      gl_FragColor = vec4( 0.1, 0.2, 0.5, 0.3 ) * intensity;
    }
  `,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
  uniforms: {
    camPos: {value: camera.position}
  }
})
const atmMesh = new THREE.Mesh(atmGeo, atmMat);
scene.add(atmMesh);




//GUI Sliders
const gui = new dat.GUI();
const settings = {
  wireframe: true,
  res: 300
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
  atmMat.uniforms.camPos.value = camera.position;
  //mesh.rotation.y += 0.002;
  renderer.render(scene, camera);
}
animate();