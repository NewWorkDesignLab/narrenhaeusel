document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const errorMsg = document.getElementById('error-msg');
    const scene = document.querySelector('a-scene');

    if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
            if (!supported) {
                startBtn.disabled = true;
                startBtn.innerText = "AR Not Supported";
                errorMsg.style.display = 'block';
                errorMsg.innerText = "Your device does not support WebXR Immersive AR.";
            }
        });
    } else {
        startBtn.disabled = true;
        startBtn.innerText = "No WebXR";
        errorMsg.style.display = 'block';
        errorMsg.innerText = "WebXR API not found. Please use Chrome on Android.";
    }

    if (startBtn) {
        startBtn.addEventListener('click', function() {
            scene.enterVR();
            document.getElementById('start-screen').style.display = 'none';
            document.getElementById('ar-hud').style.display = 'block';
        });
    }

    scene.addEventListener('exit-vr', () => {
        location.reload();
    });
});

AFRAME.registerComponent('ar-wall-spawner', {
    init: function () {
        this.ghostTracker = document.querySelector("#ghost-tracker");
        this.model = document.querySelector("#placed-model");
        this.placeBtn = document.querySelector("#place-btn");
        this.reticleUI = document.querySelector("#aiming-reticle");

        this.hitTestFound = false;
        this.placed = false;

        this.tick = AFRAME.utils.throttleTick(this.tick, 100, this);

        this.placeBtn.addEventListener('click', () => {
            if (!this.hitTestFound || this.placed) return;

            const pos = this.ghostTracker.object3D.position;
            const rot = this.ghostTracker.object3D.quaternion;

            this.model.object3D.position.copy(pos);
            this.model.object3D.quaternion.copy(rot);

            this.model.object3D.rotateX(THREE.MathUtils.degToRad(-90));

            this.model.setAttribute('visible', 'true');
            this.placed = true;

            this.placeBtn.style.display = 'none';
            this.reticleUI.style.display = 'none';
        });
    },

    tick: function () {
        if (this.placed) return;

        const trackerPos = this.ghostTracker.object3D.position;

        if (trackerPos.x !== 0 || trackerPos.y !== 0 || trackerPos.z !== 0) {
            if (!this.hitTestFound) {
                this.hitTestFound = true;
                this.placeBtn.textContent = "Place Object";
                this.placeBtn.style.background = "#28a745";
                this.placeBtn.style.color = "white";
                this.placeBtn.style.borderColor = "#28a745";
                this.placeBtn.style.opacity = "1";
                this.placeBtn.disabled = false;
                this.reticleUI.style.borderColor = "#28a745";
            }
        } else {
            if (this.hitTestFound) {
                this.hitTestFound = false;
                this.placeBtn.textContent = "Scanning wall...";
                this.placeBtn.style.background = "rgba(50, 50, 50, 0.8)";
                this.placeBtn.style.color = "#aaa";
                this.placeBtn.style.borderColor = "yellow";
                this.placeBtn.disabled = true;
                this.reticleUI.style.borderColor = "yellow";
            }
        }
    }
});