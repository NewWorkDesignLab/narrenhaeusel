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
  resetView: () => void;
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
    let lookAtY = 0.5;
    let pivotY = -0.3;

    if (aspect < 0.7) {
      camZ = 8.5;
      camY = 1.8;
      pivotY = -0.3;
      lookAtY = 0.5;
    } else if (aspect < 1) {
      camZ = 8;
      camY = 1.7;
      pivotY = -0.3;
      lookAtY = 0.5;
    } else if (aspect < 1.5) {
      camZ = 7.5;
      camY = 1.6;
      pivotY = -0.3;
      lookAtY = 0.5;
    } else if (aspect < 2) {
      camZ = 7;
      camY = 1.5;
      pivotY = -0.3;
      lookAtY = 0.4;
    } else {
      camZ = 6.5;
      camY = 1.4;
      pivotY = -0.4;
      lookAtY = 0.4;
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
  shadowPlane.receiveShadow = true;

  const pivot = new THREE.Group();
  pivot.position.y = initialCamPos.pivotY;
  scene.add(pivot);

  pivot.add(shadowPlane);

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

      const padding = 0.75;
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

      const scaledHeight = size.y * finalScale;
      const scaledMinY = box.min.y * finalScale;

      const verticalOffset = scaledHeight / 2;

      // Flachere Objekte (niedrigere Höhe) werden höher positioniert
      const heightRatio = size.y / maxDim;
      const verticalFactor = heightRatio < 0.7 ? 0.3 : 0.5;

      loadedModel.position.set(
        -center.x * finalScale,
        -scaledMinY - verticalOffset * verticalFactor,
        -center.z * finalScale
      );

      pivot.add(loadedModel);

      const modelBottomY = -scaledMinY - verticalOffset * verticalFactor;
      shadowPlane.position.y = modelBottomY - 0.15;

      viewers[index].model = loadedModel;
      console.log('Model loaded successfully:', modelPath, 'Scale:', finalScale, 'Height:', scaledHeight);
    },
    undefined,
    (error) => {
      console.error('Error loading model:', error);
    }
  );

  let isDragging = false;
  let isPanning = false;
  let previousMouseX = 0;
  let previousMouseY = 0;
  let currentScale = 1;
  let targetRotationY = 0;
  let currentRotationY = 0;

  let panX = 0;
  let panY = 0;
  let targetPanX = 0;
  let targetPanY = 0;

  const resetView = () => {
    targetRotationY = 0;
    currentRotationY = 0;
    targetPanX = 0;
    targetPanY = 0;
    panX = 0;
    panY = 0;
    currentScale = 1;
    pivot.scale.set(1, 1, 1);
    pivot.rotation.y = 0;
    pivot.position.x = 0;
    pivot.position.y = initialCamPos.pivotY;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button === 2 || event.button === 1) {
      isPanning = true;
      event.preventDefault();
    } else {
      isDragging = true;
    }
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
    canvas.style.cursor = isPanning ? 'move' : 'grabbing';
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging && !isPanning) return;

    const deltaX = event.clientX - previousMouseX;
    const deltaY = event.clientY - previousMouseY;

    if (isPanning && currentScale > 1) {
      const panSpeed = 0.01 / currentScale;
      targetPanX += deltaX * panSpeed;
      targetPanY -= deltaY * panSpeed;

      const maxPan = (currentScale - 1) * 1.5;
      targetPanX = Math.max(-maxPan, Math.min(maxPan, targetPanX));
      targetPanY = Math.max(-maxPan, Math.min(maxPan, targetPanY));
    } else if (isDragging) {
      targetRotationY += deltaX * 0.01;
    }

    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  };

  const onPointerUp = () => {
    isDragging = false;
    isPanning = false;
    canvas.style.cursor = 'grab';
  };

  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const zoomSpeed = 0.001;
    const oldScale = currentScale;
    currentScale -= event.deltaY * zoomSpeed;
    currentScale = Math.max(0.9, Math.min(4.0, currentScale));
    pivot.scale.set(currentScale, currentScale, currentScale);

    if (currentScale < oldScale) {
      const maxPan = Math.max(0, (currentScale - 1) * 1.5);
      targetPanX = Math.max(-maxPan, Math.min(maxPan, targetPanX));
      targetPanY = Math.max(-maxPan, Math.min(maxPan, targetPanY));
    }

    if (currentScale <= 1) {
      targetPanX = 0;
      targetPanY = 0;
    }
  };

  let lastTouchDistance = 0;
  let lastTouchCenterX = 0;
  let lastTouchCenterY = 0;
  let isTouchPanning = false;

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      isTouchPanning = true;
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      lastTouchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      lastTouchCenterX = (touch1.clientX + touch2.clientX) / 2;
      lastTouchCenterY = (touch1.clientY + touch2.clientY) / 2;
      event.preventDefault();
    }
  };

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 2 && isTouchPanning) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      const newDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scaleDelta = (newDistance - lastTouchDistance) * 0.005;
      currentScale += scaleDelta;
      currentScale = Math.max(0.9, Math.min(4.0, currentScale));
      pivot.scale.set(currentScale, currentScale, currentScale);
      lastTouchDistance = newDistance;

      if (currentScale > 1) {
        const newCenterX = (touch1.clientX + touch2.clientX) / 2;
        const newCenterY = (touch1.clientY + touch2.clientY) / 2;
        const deltaX = newCenterX - lastTouchCenterX;
        const deltaY = newCenterY - lastTouchCenterY;

        const panSpeed = 0.01 / currentScale;
        targetPanX += deltaX * panSpeed;
        targetPanY -= deltaY * panSpeed;

        const maxPan = (currentScale - 1) * 1.5;
        targetPanX = Math.max(-maxPan, Math.min(maxPan, targetPanX));
        targetPanY = Math.max(-maxPan, Math.min(maxPan, targetPanY));

        lastTouchCenterX = newCenterX;
        lastTouchCenterY = newCenterY;
      }

      event.preventDefault();
    }
  };

  const onTouchEnd = () => {
    isTouchPanning = false;
    lastTouchDistance = 0;
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.style.cursor = 'grab';

  const controls = {
    update: () => {},
    dispose: () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    }
  } as unknown as OrbitControls;

  function animate() {
    requestAnimationFrame(animate);

    currentRotationY += (targetRotationY - currentRotationY) * 0.1;
    panX += (targetPanX - panX) * 0.1;
    panY += (targetPanY - panY) * 0.1;

    pivot.rotation.y = currentRotationY;
    pivot.position.x = panX;
    pivot.position.y = initialCamPos.pivotY + panY;

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

    initialCamPos.pivotY = newCamPos.pivotY;

    if (viewers[index]?.model) {
      const model = viewers[index].model!;

      const currentScaleVal = model.scale.x;
      model.scale.set(1, 1, 1);
      model.position.set(0, 0, 0);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const padding = 0.75;
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
      const newScale = targetScale * viewportScale * currentScale;

      model.scale.set(newScale, newScale, newScale);

      const scaledHeight = size.y * newScale;
      const scaledMinY = box.min.y * newScale;
      const verticalOffset = scaledHeight / 2;

      // Flachere Objekte (niedrigere Höhe) werden höher positioniert
      const heightRatio = size.y / maxDim;
      const verticalFactor = heightRatio < 0.7 ? 0.3 : 0.5;

      model.position.set(
        -center.x * newScale,
        -scaledMinY - verticalOffset * verticalFactor,
        -center.z * newScale
      );

      const modelBottomY = -scaledMinY - verticalOffset * verticalFactor;
      shadowPlane.position.y = modelBottomY - 0.15;
    }
  });
  resizeObserver.observe(container);

  viewers[index] = { scene, camera, renderer, controls, model: loadedModel, pivot, resetView };
  return viewers[index];
}

export function getViewer(index: number): ViewerInstance | undefined {
  return viewers[index];
}

export function resetViewerView(index: number): void {
  const viewer = viewers[index];
  if (viewer?.resetView) {
    viewer.resetView();
  }
}
