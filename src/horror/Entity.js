import * as THREE from 'three';

export function createEntity(scene, camera, audioManager) {
    // ── The Glitch Entity ──
    // A corrupted digital being — the code that came alive during the crash
    const group = new THREE.Group();

    // Body — distorted humanoid shape
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x220022,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.7,
        wireframe: true,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.3), bodyMat);
    torso.position.y = 1.0;
    group.add(torso);

    // Head
    const headMat = new THREE.MeshStandardMaterial({
        color: 0x110011,
        emissive: 0x440044,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.8,
        wireframe: true,
    });
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), headMat);
    head.position.y = 1.8;
    group.add(head);

    // Eyes — glowing red
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.04), eyeMat);
    leftEye.position.set(-0.08, 1.85, 0.2);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.04), eyeMat);
    rightEye.position.set(0.08, 1.85, 0.2);
    group.add(rightEye);

    // Arms — elongated like Poppy Playtime's Huggy Wuggy
    const armMat = bodyMat.clone();
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.15), armMat);
    leftArm.position.set(-0.5, 0.8, 0);
    leftArm.rotation.z = 0.3;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.15), armMat);
    rightArm.position.set(0.5, 0.8, 0);
    rightArm.rotation.z = -0.3;
    group.add(rightArm);

    // Entity aura
    const auraMat = new THREE.MeshBasicMaterial({
        color: 0x440044,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
    });
    const aura = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), auraMat);
    aura.position.y = 1.2;
    group.add(aura);

    // Point light for the entity
    const entityLight = new THREE.PointLight(0x880088, 0.5, 8);
    entityLight.position.y = 1.5;
    group.add(entityLight);

    group.visible = false;
    scene.add(group);

    // ── Entity AI State ──
    const entityState = {
        active: false,
        activateTime: 45 + Math.random() * 30,
        position: new THREE.Vector3(9, 0, -20),
        patrolPoints: [
            new THREE.Vector3(9, 0, -8),
            new THREE.Vector3(0, 0, -5),
            new THREE.Vector3(-9, 0, -5),
            new THREE.Vector3(0, 0, -12),
            new THREE.Vector3(12, 0, -21),
            new THREE.Vector3(-12, 0, -19),
        ],
        currentTarget: 0,
        speed: 2.5,
        detectionRange: 6,
        chaseSpeed: 4,
        chasing: false,
        glitchTimer: 0,
        visibleTimer: 0,
        appearsFor: 3 + Math.random() * 4,
        hideFor: 15 + Math.random() * 20,
        isShowing: false,
    };

    function update(delta, elapsed, playerPos) {
        entityState.activateTime -= delta;
        if (entityState.activateTime > 0) return;

        if (!entityState.active) {
            entityState.active = true;
            audioManager.playWhisper();
        }

        // Visibility cycle — appears and disappears
        entityState.visibleTimer += delta;
        if (entityState.isShowing) {
            if (entityState.visibleTimer > entityState.appearsFor) {
                entityState.isShowing = false;
                entityState.visibleTimer = 0;
                entityState.hideFor = 10 + Math.random() * 20;
                group.visible = false;
            }
        } else {
            if (entityState.visibleTimer > entityState.hideFor) {
                entityState.isShowing = true;
                entityState.visibleTimer = 0;
                entityState.appearsFor = 3 + Math.random() * 5;
                group.visible = true;
                // Pick a patrol point near the player
                const closest = entityState.patrolPoints.reduce((best, pt) => {
                    return pt.distanceTo(playerPos) < best.distanceTo(playerPos) ? pt : best;
                });
                entityState.position.copy(closest);
                audioManager.playScare();
            }
        }

        if (!entityState.isShowing) return;

        // Move entity
        const target = entityState.patrolPoints[entityState.currentTarget];
        const dir = new THREE.Vector3().subVectors(target, entityState.position).normalize();
        const dist = entityState.position.distanceTo(target);

        if (dist < 1) {
            entityState.currentTarget = (entityState.currentTarget + 1) % entityState.patrolPoints.length;
        }

        const playerDist = entityState.position.distanceTo(playerPos);
        const speed = playerDist < entityState.detectionRange ? entityState.chaseSpeed : entityState.speed;

        if (playerDist < entityState.detectionRange) {
            // Chase player
            const chaseDir = new THREE.Vector3().subVectors(playerPos, entityState.position).normalize();
            entityState.position.add(chaseDir.multiplyScalar(speed * delta));
            entityState.chasing = true;

            if (playerDist < 2) {
                audioManager.playScare();
                audioManager.playHeartbeat();
                // Scare flash and teleport entity away
                const flash = document.createElement('div');
                flash.className = 'damage-flash';
                document.body.appendChild(flash);
                setTimeout(() => flash.remove(), 500);
                entityState.isShowing = false;
                group.visible = false;
                entityState.visibleTimer = 0;
                entityState.hideFor = 20 + Math.random() * 15;
            }
        } else {
            entityState.position.add(dir.multiplyScalar(speed * delta));
            entityState.chasing = false;
        }

        // Update mesh
        group.position.copy(entityState.position);
        group.lookAt(playerPos.x, entityState.position.y, playerPos.z);

        // Glitch animation
        entityState.glitchTimer += delta;
        const glitchOffset = Math.sin(entityState.glitchTimer * 20) * 0.1;
        torso.position.x = glitchOffset;
        head.rotation.z = Math.sin(entityState.glitchTimer * 15) * 0.3;
        leftArm.rotation.x = Math.sin(elapsed * 3) * 0.5;
        rightArm.rotation.x = Math.sin(elapsed * 3 + 1) * 0.5;

        // Aura pulse
        aura.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.2);
        auraMat.opacity = 0.05 + Math.sin(elapsed * 6) * 0.05;

        // Entity light flicker
        entityLight.intensity = 0.3 + Math.random() * 0.5;

        // Nearby heartbeat
        if (playerDist < 10) {
            if (Math.random() < 0.005) audioManager.playHeartbeat();
        }
    }

    return { update };
}
