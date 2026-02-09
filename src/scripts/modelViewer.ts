import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ViewerInstance {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  model: THREE.Group | null;
  pivot: THREE.Group;
}

const viewers: Record<number, ViewerInstance> = {};

export function initModelViewer(index: number): ViewerInstance | null {
  if (viewers[index]) return viewers[index];

  const canvas = document.getElementById(`canvas-${index}`) as HTMLCanvasElement;
  const container = document.getElementById(`model-viewer-${index}`);
  if (!canvas || !container) return null;

  const modelPath = container.dataset.modelPath;
  if (!modelPath) return null;

  const scene = new THREE.Scene();

  function calculateCameraPosition(containerWidth: number, containerHeight: number) {
    const aspect = containerWidth / containerHeight;

    let camX = -2;
    let camY = 1.5;
    let camZ = 7;
    const lookAtY = 0;
    let pivotY = 0;

    if (aspect < 0.7) {
      camZ = 9.5;
      camY = 2.5;
      pivotY = 0.8;
    } else if (aspect < 1) {
      camZ = 9;
      camY = 2.5;
      pivotY = 0.6;
    } else if (aspect < 1.5) {
      camZ = 8;
      camY = 2.5;
      pivotY = 0.4;
    } else if (aspect < 2) {
      camZ = 7.5;
      camY = 2.5;
      pivotY = 0.3;
    } else {
      camZ = 7;
      camY = 2.5;
      pivotY = 0.2;
    }

    return { x: camX, y: camY, z: camZ, lookAtY, pivotY };
  }

  const initialCamPos = calculateCameraPosition(container.offsetWidth, container.offsetHeight);
  const camera = new THREE.PerspectiveCamera(35, container.offsetWidth / container.offsetHeight, 0.1, 1000);
  camera.position.set(initialCamPos.x, initialCamPos.y, initialCamPos.z);
  camera.lookAt(0.2, initialCamPos.lookAtY, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const shadowPlaneGeometry = new THREE.PlaneGeometry(50, 50);
  const shadowPlaneMaterial = new THREE.ShadowMaterial({
    opacity: 0.18,
  });
  const shadowPlane = new THREE.Mesh(shadowPlaneGeometry, shadowPlaneMaterial);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.45;
  shadowPlane.receiveShadow = true;

  const pivot = new THREE.Group();
  pivot.position.y = initialCamPos.pivotY;
  pivot.add(shadowPlane);
  scene.add(pivot);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 20, 0);
  directionalLight.castShadow = true;

  directionalLight.shadow.mapSize.width = 4096;
  directionalLight.shadow.mapSize.height = 4096;
  directionalLight.shadow.camera.near = 5;
  directionalLight.shadow.camera.far = 30;
  directionalLight.shadow.camera.left = -4;
  directionalLight.shadow.camera.right = 4;
  directionalLight.shadow.camera.top = 4;
  directionalLight.shadow.camera.bottom = -4;
  directionalLight.shadow.bias = -0.0003;
  directionalLight.shadow.normalBias = 0.03;
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-8, 8, -8);
  scene.add(fillLight);

  const loader = new GLTFLoader();
  let loadedModel: THREE.Group | null = null;

  loader.load(
    modelPath,
    (gltf) => {
      loadedModel = gltf.scene;

      loadedModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = false;
        }
      });

      const box = new THREE.Box3().setFromObject(loadedModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const padding = 0.85;
      const maxHorizontal = Math.max(size.x, size.z);
      const maxDim = Math.max(maxHorizontal, size.y);
      const targetScale = (4.0 * padding) / maxDim;

      let viewportScale: number;
      if (container.offsetWidth < 768) {
        viewportScale = Math.min(container.offsetWidth / 320, 1.4);
      } else if (container.offsetWidth < 1024) {
        viewportScale = Math.min(container.offsetWidth / 400, 1.2);
      } else {
        viewportScale = Math.min(container.offsetWidth / 500, 1.0);
      }
      const finalScale = targetScale * viewportScale;

      loadedModel.scale.set(finalScale, finalScale, finalScale);

      loadedModel.position.set(
        -center.x * finalScale,
        -center.y * finalScale,
        -center.z * finalScale
      );

      pivot.add(loadedModel);

      viewers[index].model = loadedModel;
      console.log('Model loaded successfully:', modelPath);
    },
    undefined,
    (error) => {
      console.error('Error loading model:', error);
    }
  );

  let isDragging = false;
  let previousMouseX = 0;
  let previousMouseY = 0;
  let currentScale = 1;
  let targetRotationY = 0;
  let targetRotationX = 0;
  let currentRotationY = 0;
  let currentRotationX = 0;

  targetRotationY = 0;
  targetRotationX = 0;

  const onPointerDown = (event: PointerEvent) => {
    isDragging = true;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
    canvas.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - previousMouseX;
    const deltaY = event.clientY - previousMouseY;

    targetRotationY += deltaX * 0.01;

    targetRotationX += deltaY * 0.005;
    targetRotationX = Math.max(-0.3, Math.min(0.3, targetRotationX));

    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  };

  const onPointerUp = () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const zoomSpeed = 0.001;
    currentScale -= event.deltaY * zoomSpeed;
    currentScale = Math.max(0.5, Math.min(2.0, currentScale));
    pivot.scale.set(currentScale, currentScale, currentScale);
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.style.cursor = 'grab';

  const controls = {
    update: () => {},
    dispose: () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    }
  } as unknown as OrbitControls;

  function animate() {
    requestAnimationFrame(animate);

    currentRotationY += (targetRotationY - currentRotationY) * 0.1;
    currentRotationX += (targetRotationX - currentRotationX) * 0.1;

    pivot.rotation.y = currentRotationY;
    pivot.rotation.x = currentRotationX;

    renderer.render(scene, camera);
  }
  animate();

  const resizeObserver = new ResizeObserver(() => {
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);

    const newCamPos = calculateCameraPosition(container.offsetWidth, container.offsetHeight);
    camera.position.set(newCamPos.x, newCamPos.y, newCamPos.z);
    camera.lookAt(0.2, newCamPos.lookAtY, 0);

    pivot.position.y = newCamPos.pivotY;

    if (viewers[index]?.model) {
      const model = viewers[index].model!;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());

      const currentScaleVal = model.scale.x;
      const originalSize = {
        x: size.x / currentScaleVal,
        y: size.y / currentScaleVal,
        z: size.z / currentScaleVal
      };

      const padding = 0.85;
      const maxHorizontal = Math.max(originalSize.x, originalSize.z);
      const maxDim = Math.max(maxHorizontal, originalSize.y);
      const targetScale = (4.0 * padding) / maxDim;

      let viewportScale: number;
      if (container.offsetWidth < 768) {
        viewportScale = Math.min(container.offsetWidth / 320, 1.4);
      } else if (container.offsetWidth < 1024) {
        viewportScale = Math.min(container.offsetWidth / 400, 1.2);
      } else {
        viewportScale = Math.min(container.offsetWidth / 500, 1.0);
      }
      const newScale = targetScale * viewportScale * currentScale;

      model.scale.set(newScale, newScale, newScale);
    }
  });
  resizeObserver.observe(container);

  viewers[index] = { scene, camera, renderer, controls, model: loadedModel, pivot };
  return viewers[index];
}

export function getViewer(index: number): ViewerInstance | undefined {
  return viewers[index];
}
