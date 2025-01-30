// Initialize smooth scrolling
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Setup Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfefdfd);

// Setup camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Setup renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
function initRenderer() {
  renderer.setClearColor(0xffffff, 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  // renderer.physicallyCorrectLights = true;
  document.querySelector(".model").appendChild(renderer.domElement);
}
initRenderer();

// Setup lights
function setupLights() {
  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Key light - warm white for main illumination
  const mainLight = new THREE.DirectionalLight(0xffffff, 2);
  mainLight.position.set(5, 10, 7.5);
  mainLight.castShadow = true;
  scene.add(mainLight);

  // Fill light - cooler tone for metallic highlights
  const fillLight = new THREE.DirectionalLight(0xb3d1ff, 0.5);
  fillLight.position.set(-5, 0, 1);
  scene.add(fillLight);

  // Rim light - bright white for metallic edge definition
  const rimLight = new THREE.DirectionalLight(0xffffff, 2);
  rimLight.position.set(0, 5, -10);
  scene.add(rimLight);

  // Point light for specular highlights
  const specularLight = new THREE.PointLight(0xffffff, 1, 20);
  specularLight.position.set(2, 2, 2);
  scene.add(specularLight);
}
setupLights();

// Basic animation loop
function basicAnimate() {
  renderer.render(scene, camera);
  requestAnimationFrame(basicAnimate);
}
basicAnimate();

// Model loading and setup
let model;
const loader = new THREE.GLTFLoader();

function setupModelMaterials(node) {
  if (node.isMesh) {
    if (node.material) {
      node.material.metalness = 0.3;
      node.material.roughness = 0.4;
      node.material.envMapIntensity = 1.5;
    }
    node.castShadow = true;
    node.receiveShadow = true;
  }
}

function centerModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  return box;
}

loader.load("./assets/josta2.glb", function (gltf) {
  model = gltf.scene;
  model.traverse(setupModelMaterials);

  const box = centerModel(model);
  scene.add(model);

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.z = maxDim * 1.5;

  model.scale.set(0, 0, 0);
  playInitialAnimation();
  cancelAnimationFrame(basicAnimate);
  animate();
});

// Animation constants
const floatAmplitude = 0.3;
const floatSpeed = 0.2;
const rotationSpeed = 0.5;
let isFloating = true;
let currentScroll = 0;

// DOM elements and settings
const stickyHeight = window.innerHeight;
const scannerSection = document.querySelector(".scanner");
const scannerPosition = scannerSection.offsetTop;
const scanContainer = document.querySelector(".scan-container");
const scanSound = new Audio("./assets/scan-sfx.mp3");

// Initial animations
gsap.set(scanContainer, { scale: 0 });

function playInitialAnimation() {
  if (model) {
    gsap.to(model.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1,
      ease: "power2.out",
    });
  }
  gsap.to(scanContainer, {
    scale: 1,
    duration: 1,
    ease: "power2.out",
  });
}

// Scroll triggers
function setupScrollTriggers() {
  ScrollTrigger.create({
    trigger: "body",
    start: "top top",
    end: " top -10",
    onEnterBack: () => {
      if (model) {
        gsap.to(model.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 1,
          ease: "power2.out",
        });
        isFloating = true;
      }
      gsap.to(scanContainer, {
        scale: 1,
        duration: 1,
        ease: "power2.out",
      });
    },
  });

  ScrollTrigger.create({
    trigger: ".scanner",
    start: "top top",
    end: `${stickyHeight}px`,
    pin: true,
    onEnter: () => {
      if (model) {
        isFloating = false;
        model.position.y = 0;
        setTimeout(() => {
          scanSound.currentTime = 0;
          scanSound.play();
        }, 500);
        gsap.to(model.rotation, {
          y: model.rotation.y + Math.PI * 2,
          duration: 1,
          ease: "power2.inOut",
        });
      }
    },
    onLeaveBack: () => {
      gsap.set(scanContainer, { scale: 0 });
      gsap.to(scanContainer, {
        scale: 1,
        duration: 1,
        ease: "power2.out",
      });
    },
  });
}
setupScrollTriggers();

// Scroll and animation handling
lenis.on("scroll", (e) => {
  currentScroll = e.scrollY;
});

function updateModelAnimation() {
  if (!model) return;

  if (isFloating) {
    const floatOffset = Math.sin(Date.now() * 0.01 * floatSpeed) * floatAmplitude;
    model.position.y = floatOffset;
  }

  // Calculate scroll progress relative to viewport height for smoother rotation
  const scrollProgress = Math.min(window.scrollY / window.innerHeight, 1);
  
  if (scrollProgress < 1) {
    // Adjust rotation multiplier for more dramatic effect
    model.rotation.x = scrollProgress * Math.PI * 2;
    model.rotation.y += 0.01 * rotationSpeed;
  }
}

function animate() {
  updateModelAnimation();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
