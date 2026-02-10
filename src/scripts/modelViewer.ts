import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
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
      camZ = 10.5;
      camY = 1.8;
      pivotY = -0.3;
      lookAtY = 0.5;
    } else if (aspect < 1) {
      camZ = 9.5;
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

  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'model-loading';
  loadingOverlay.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-progress">0%</div>
  `;
  container.appendChild(loadingOverlay);


  const loader = new GLTFLoader();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  dracoLoader.preload();
  loader.setDRACOLoader(dracoLoader);

  let loadedModel: THREE.Group | null = null;

  loader.load(
    modelPath,
    (gltf) => {
      loadingOverlay.remove();

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
    (progress) => {
      if (progress.lengthComputable) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        const progressEl = loadingOverlay.querySelector('.loading-progress');
        if (progressEl) {
          progressEl.textContent = `${percent}%`;
        }
      }
    },
    (error) => {
      console.error('Error loading model:', error);
      loadingOverlay.innerHTML = '<div class="loading-error">Fehler beim Laden</div>';
    }
  );

  let isDragging = false;
  let isPanning = false;
  let previousMouseX = 0;
  let previousMouseY = 0;
  let currentScale = 1;
  let targetRotationY = 0;
  let currentRotationY = 0;
  let targetPanY = 0;
  let currentPanY = 0;
  let hasInteracted = false;
  let idleTime = 0;

  let panSlider: HTMLDivElement | null = null;
  let sliderThumb: HTMLDivElement | null = null;
  let isSliderDragging = false;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   ('ontouchstart' in window);

  function createPanSlider() {
    if (panSlider || !container) return;

    panSlider = document.createElement('div');
    panSlider.className = 'pan-slider';
    panSlider.innerHTML = `
      <div class="pan-slider-track">
        <div class="pan-slider-thumb"></div>
      </div>
    `;
    container.appendChild(panSlider);
    sliderThumb = panSlider.querySelector('.pan-slider-thumb');

    const track = panSlider.querySelector('.pan-slider-track') as HTMLDivElement;

    track.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      isSliderDragging = true;
      updateSliderFromTouch(e);
    }, { passive: false });

    track.addEventListener('touchmove', (e) => {
      if (!isSliderDragging) return;
      e.preventDefault();
      e.stopPropagation();
      updateSliderFromTouch(e);
    }, { passive: false });

    track.addEventListener('touchend', () => {
      isSliderDragging = false;
    });
  }

  function updateSliderFromTouch(e: TouchEvent) {
    if (!panSlider) return;
    const track = panSlider.querySelector('.pan-slider-track') as HTMLDivElement;
    const rect = track.getBoundingClientRect();
    const touch = e.touches[0];
    const relativeY = (touch.clientY - rect.top) / rect.height;
    const clampedY = Math.max(0, Math.min(1, relativeY));

    const panRange = getPanRange();
    targetPanY = panRange.max - clampedY * (panRange.max - panRange.min);
  }

  function getPanRange() {
    const baseRange = 3.5;
    const zoomFactor = Math.max(0, currentScale - 0.8);
    const range = baseRange * zoomFactor;
    return { min: -range, max: range };
  }

  function updateSliderVisibility() {
    if (!isMobile) return;

    const shouldShow = currentScale > 1.3;

    if (shouldShow && !panSlider) {
      createPanSlider();
    }

    if (panSlider) {
      panSlider.style.opacity = shouldShow ? '1' : '0';
      panSlider.style.pointerEvents = shouldShow ? 'auto' : 'none';

      if (sliderThumb) {
        const panRange = getPanRange();
        const normalizedPos = panRange.max - panRange.min > 0
          ? (panRange.max - currentPanY) / (panRange.max - panRange.min)
          : 0.5;
        const clampedPos = Math.max(0, Math.min(1, normalizedPos));
        sliderThumb.style.top = `${clampedPos * 100}%`;
      }
    }
  }

  const resetView = () => {
    targetRotationY = 0;
    currentRotationY = 0;
    targetPanY = 0;
    currentPanY = 0;
    currentScale = 1;
    pivot.scale.set(1, 1, 1);
    pivot.rotation.y = 0;
    pivot.position.y = initialCamPos.pivotY;
    updateSliderVisibility();
  };

  const onPointerDown = (event: PointerEvent) => {
    hasInteracted = true;

    if (event.button === 2) {
      isPanning = true;
      previousMouseY = event.clientY;
      canvas.style.cursor = 'ns-resize';
    } else {
      isDragging = true;
      previousMouseX = event.clientX;
      canvas.style.cursor = 'grabbing';
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (isPanning) {
      const deltaY = event.clientY - previousMouseY;
      const panRange = getPanRange();
      targetPanY -= deltaY * 0.01;
      targetPanY = Math.max(panRange.min, Math.min(panRange.max, targetPanY));
      previousMouseY = event.clientY;
    } else if (isDragging) {
      const deltaX = event.clientX - previousMouseX;
      targetRotationY += deltaX * 0.01;
      previousMouseX = event.clientX;
    }
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
    hasInteracted = true;
    const zoomSpeed = 0.001;
    currentScale -= event.deltaY * zoomSpeed;
    currentScale = Math.max(0.5, Math.min(4.0, currentScale));
    pivot.scale.set(currentScale, currentScale, currentScale);

    const panRange = getPanRange();
    targetPanY = Math.max(panRange.min, Math.min(panRange.max, targetPanY));

    updateSliderVisibility();
  };

  let lastTouchDistance = 0;
  let isSingleTouch = false;
  let lastSingleTouchX = 0;

  const onTouchStart = (event: TouchEvent) => {
    hasInteracted = true;
    if (event.touches.length === 2) {
      isSingleTouch = false;
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      lastTouchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      event.preventDefault();
    } else if (event.touches.length === 1) {
      isSingleTouch = true;
      lastSingleTouchX = event.touches[0].clientX;
      canvas.style.cursor = 'grabbing';
    }
  };

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      const newDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scaleDelta = (newDistance - lastTouchDistance) * 0.004;
      currentScale += scaleDelta;
      currentScale = Math.max(0.5, Math.min(4.0, currentScale));
      pivot.scale.set(currentScale, currentScale, currentScale);
      lastTouchDistance = newDistance;

      const panRange = getPanRange();
      targetPanY = Math.max(panRange.min, Math.min(panRange.max, targetPanY));

      updateSliderVisibility();

      event.preventDefault();
    } else if (event.touches.length === 1 && isSingleTouch) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - lastSingleTouchX;

      targetRotationY += deltaX * 0.008;

      lastSingleTouchX = touch.clientX;

      event.preventDefault();
    }
  };

  const onTouchEnd = () => {
    isSingleTouch = false;
    lastTouchDistance = 0;
    canvas.style.cursor = 'grab';
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

    if (!hasInteracted) {
      idleTime += 0.016;
      targetRotationY = Math.sin(idleTime * 0.2) * 0.15;
    }

    const smoothFactor = 0.08;
    currentRotationY += (targetRotationY - currentRotationY) * smoothFactor;
    currentPanY += (targetPanY - currentPanY) * smoothFactor;

    if (Math.abs(targetRotationY - currentRotationY) < 0.0001) currentRotationY = targetRotationY;
    if (Math.abs(targetPanY - currentPanY) < 0.0001) currentPanY = targetPanY;

    pivot.rotation.y = currentRotationY;
    pivot.position.y = initialCamPos.pivotY + currentPanY;

    updateSliderVisibility();

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
