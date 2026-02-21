import * as THREE from 'three';

export function createBlizzard(scene) {
    // ── Snow Particles ──
    const snowCount = 8000;
    const snowGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(snowCount * 3);
    const velocities = new Float32Array(snowCount * 3);
    const sizes = new Float32Array(snowCount);

    for (let i = 0; i < snowCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 80;
        positions[i3 + 1] = Math.random() * 30;
        positions[i3 + 2] = (Math.random() - 0.5) * 80;
        velocities[i3] = (Math.random() - 0.5) * 2;     // x drift
        velocities[i3 + 1] = -(1.5 + Math.random() * 3); // fall speed
        velocities[i3 + 2] = (Math.random() - 0.5) * 2;  // z drift
        sizes[i] = 0.03 + Math.random() * 0.08;
    }

    snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    snowGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const snowMat = new THREE.PointsMaterial({
        color: 0xddeeff,
        size: 0.06,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
    });

    const snowPoints = new THREE.Points(snowGeo, snowMat);
    scene.add(snowPoints);

    // ── Wind Streaks ──
    const streakCount = 300;
    const streakGeo = new THREE.BufferGeometry();
    const streakPos = new Float32Array(streakCount * 6);
    for (let i = 0; i < streakCount; i++) {
        const i6 = i * 6;
        const x = (Math.random() - 0.5) * 60;
        const y = Math.random() * 20;
        const z = (Math.random() - 0.5) * 60;
        streakPos[i6] = x;
        streakPos[i6 + 1] = y;
        streakPos[i6 + 2] = z;
        streakPos[i6 + 3] = x + 0.5 + Math.random() * 1.5;
        streakPos[i6 + 4] = y - 0.1;
        streakPos[i6 + 5] = z + 0.3;
    }
    streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
    const streakMat = new THREE.LineBasicMaterial({
        color: 0xaaccee,
        transparent: true,
        opacity: 0.15,
    });
    const streaks = new THREE.LineSegments(streakGeo, streakMat);
    scene.add(streaks);

    // ── Fog Volume (dense near ground outside) ──
    const fogPlanes = [];
    for (let i = 0; i < 5; i++) {
        const fogMat = new THREE.MeshBasicMaterial({
            color: 0x8899aa,
            transparent: true,
            opacity: 0.04 + i * 0.01,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const fogPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, 15), fogMat);
        fogPlane.position.set(0, 2 + i * 2, 20 + i * 5);
        fogPlane.rotation.y = Math.random() * 0.3;
        scene.add(fogPlane);
        fogPlanes.push(fogPlane);
    }

    // ── Frost on windows (inside building) ──
    const frostMat = new THREE.MeshStandardMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.08,
        roughness: 0.2,
        metalness: 0.1,
        side: THREE.DoubleSide,
    });

    function update(delta, elapsed) {
        const pos = snowGeo.attributes.position.array;
        const windX = Math.sin(elapsed * 0.3) * 3;
        const windZ = Math.cos(elapsed * 0.2) * 2;

        for (let i = 0; i < snowCount; i++) {
            const i3 = i * 3;
            pos[i3] += (velocities[i3] + windX) * delta;
            pos[i3 + 1] += velocities[i3 + 1] * delta;
            pos[i3 + 2] += (velocities[i3 + 2] + windZ) * delta;

            // Reset fallen snow
            if (pos[i3 + 1] < -1) {
                pos[i3] = (Math.random() - 0.5) * 80;
                pos[i3 + 1] = 25 + Math.random() * 5;
                pos[i3 + 2] = (Math.random() - 0.5) * 80;
            }
        }
        snowGeo.attributes.position.needsUpdate = true;

        // Animate wind streaks
        const sPos = streakGeo.attributes.position.array;
        for (let i = 0; i < streakCount; i++) {
            const i6 = i * 6;
            sPos[i6] += (windX * 0.5 + 3) * delta;
            sPos[i6 + 2] += windZ * 0.3 * delta;
            sPos[i6 + 3] += (windX * 0.5 + 3) * delta;
            sPos[i6 + 5] += windZ * 0.3 * delta;
            if (sPos[i6] > 40) {
                const x = -40 + Math.random() * 10;
                const y = Math.random() * 20;
                const z = (Math.random() - 0.5) * 60;
                sPos[i6] = x; sPos[i6 + 1] = y; sPos[i6 + 2] = z;
                sPos[i6 + 3] = x + 1; sPos[i6 + 4] = y - 0.1; sPos[i6 + 5] = z + 0.3;
            }
        }
        streakGeo.attributes.position.needsUpdate = true;

        // Fog sway
        fogPlanes.forEach((fp, i) => {
            fp.position.x = Math.sin(elapsed * 0.1 + i) * 5;
            fp.material.opacity = 0.03 + Math.sin(elapsed * 0.2 + i) * 0.015;
        });
    }

    return { update, particles: snowPoints, streaks, fogPlanes };
}
