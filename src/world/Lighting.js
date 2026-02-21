import * as THREE from 'three';

export function setupLighting(scene, camera) {
    // ── Ambient — bright enough to see surroundings ──
    const ambient = new THREE.AmbientLight(0x3a3a4a, 2.0);
    scene.add(ambient);

    // ── Hemisphere light (sky/ground bounce) ──
    const hemiLight = new THREE.HemisphereLight(0x556677, 0x2a2a33, 1.2);
    scene.add(hemiLight);

    // ── Exterior directional (blizzard overcast sky) ──
    const dirLight = new THREE.DirectionalLight(0x8899bb, 0.5);
    dirLight.position.set(-5, 10, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    scene.add(dirLight);

    // ── Emergency red lighting (lobby) ──
    const emergRed1 = new THREE.PointLight(0xff2222, 1.5, 25);
    emergRed1.position.set(0, 3.5, 9);
    scene.add(emergRed1);

    const emergRed2 = new THREE.PointLight(0xff2222, 1.2, 20);
    emergRed2.position.set(-5, 3.5, 4);
    scene.add(emergRed2);

    // ── Hallway flickering fluorescents ──
    const hallLights = [];
    for (let i = 0; i < 4; i++) {
        const light = new THREE.PointLight(0xccccdd, 0.0, 6);
        light.position.set(0, 3.8, 3 - i * 5);
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        scene.add(light);
        // Fluorescent tube mesh
        const tube = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.05, 0.15),
            new THREE.MeshStandardMaterial({
                color: 0xffffff, emissive: 0xccccdd, emissiveIntensity: 0.3
            })
        );
        tube.position.copy(light.position);
        tube.position.y += 0.1;
        scene.add(tube);
        hallLights.push({ light, tube, nextFlicker: Math.random() * 3, on: false });
    }

    const officeDim = new THREE.PointLight(0x5566880, 1.2, 25);
    officeDim.position.set(-9, 3.5, -5);
    scene.add(officeDim);

    // ── Server room (red glow) ──
    const serverRed = new THREE.PointLight(0xff0000, 1.8, 25);
    serverRed.position.set(9, 3.5, -5);
    serverRed.castShadow = true;
    scene.add(serverRed);

    const breakLight = new THREE.PointLight(0x3344ff, 1.0, 18);
    breakLight.position.set(-12, 2, -19);
    scene.add(breakLight);

    // ── Basement (dim red) ──
    const basementLight = new THREE.PointLight(0x880000, 1.0, 20);
    basementLight.position.set(12, 3, -21);
    scene.add(basementLight);

    // ── Player Flashlight ──
    const flashlightTarget = new THREE.Object3D();
    flashlightTarget.position.set(0, 1.7, 0);
    scene.add(flashlightTarget);

    const flashlight = new THREE.SpotLight(0xfff0dd, 8.0, 50, Math.PI / 4, 0.25, 1.0);
    flashlight.position.copy(camera.position);
    flashlight.target = flashlightTarget;
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    flashlight.shadow.camera.near = 0.1;
    flashlight.shadow.camera.far = 40;
    scene.add(flashlight);

    // ── Flickering Update ──
    let flickerTimer = 0;
    function updateFlicker(delta) {
        flickerTimer += delta;
        hallLights.forEach(hl => {
            if (flickerTimer > hl.nextFlicker) {
                hl.on = !hl.on;
                hl.light.intensity = hl.on ? (0.6 + Math.random() * 0.6) : 0;
                hl.tube.material.emissiveIntensity = hl.on ? 0.5 : 0.05;
                hl.nextFlicker = flickerTimer + (hl.on ? 0.05 + Math.random() * 2 : 0.02 + Math.random() * 0.15);
            }
        });

        // Server room pulse
        serverRed.intensity = 0.3 + Math.sin(flickerTimer * 2) * 0.2;

        // TV flicker
        breakLight.intensity = 0.2 + Math.random() * 0.15;

        // Basement pulse
        basementLight.intensity = 0.2 + Math.sin(flickerTimer * 0.8) * 0.15;
    }

    // Run flicker in animation loop via scene event
    const originalOnBeforeRender = scene.onBeforeRender;
    scene.onBeforeRender = (renderer, s, c) => {
        if (originalOnBeforeRender) originalOnBeforeRender(renderer, s, c);
    };

    // Use requestAnimationFrame-based update
    let lastTime = performance.now();
    function flickerLoop() {
        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        updateFlicker(dt);
        requestAnimationFrame(flickerLoop);
    }
    flickerLoop();

    return {
        flashlightObj: flashlight,
        flashlightTargetObj: flashlightTarget,
    };
}
