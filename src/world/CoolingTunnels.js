import * as THREE from 'three';
import { TextureFactory } from '../engine/TextureFactory.js';

/**
 * Underground Cooling Tunnels
 * Fully enclosed underground hallways with proper walls, floors, ceilings.
 * Features: steam bursts, failing pipes with colliders, dark sections, valve puzzle.
 */
export function buildCoolingTunnels(scene) {
    const colliders = [];
    const interactableObjects = [];

    // ── Constants ──
    const Y = -4;       // Underground floor level
    const H = 3.2;      // Tunnel height
    const HH = Y + H / 2;  // Half-height center
    const W = 0.5;      // Wall thickness
    const TW = 3.5;     // Standard tunnel width

    // ── Materials ──
    const concreteMat = TextureFactory.createConcreteMaterial({ color: [50, 55, 58] });
    const floorMat = TextureFactory.createFloorMaterial();
    const ceilingMat = TextureFactory.createConcreteMaterial({ color: [35, 38, 40] });
    const pipeMat = TextureFactory.createMetalMaterial({ color: [70, 75, 80], roughness: 0.4, metalness: 0.8 });
    const rustPipeMat = TextureFactory.createMetalMaterial({ color: [100, 55, 35], roughness: 0.7, metalness: 0.5 });
    const metalMat = TextureFactory.createMetalMaterial({ color: [55, 60, 65] });
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.8 });
    const hazardMat = new THREE.MeshStandardMaterial({
        color: 0xccaa00, emissive: 0x443300, emissiveIntensity: 0.3
    });
    const valveMat = new THREE.MeshStandardMaterial({
        color: 0xcc2200, roughness: 0.4, metalness: 0.6
    });
    const steamMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, transparent: true, opacity: 0.15, emissive: 0x222222, emissiveIntensity: 0.3
    });

    // ── Helper functions ──
    function addBox(w, h, d, mat, x, y, z, isCollider = false) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m);
        if (isCollider) {
            const box = new THREE.Box3();
            box.setFromCenterAndSize(new THREE.Vector3(x, y, z), new THREE.Vector3(w, h, d));
            colliders.push(box);
        }
        return m;
    }

    // Build a fully enclosed room section (floor + ceiling + 4 walls with optional openings)
    function buildRoom(x1, x2, z1, z2, openings = {}) {
        const w = Math.abs(x2 - x1);
        const d = Math.abs(z2 - z1);
        const cx = (x1 + x2) / 2;
        const cz = (z1 + z2) / 2;

        // Floor
        addBox(w, 0.3, d, floorMat, cx, Y - 0.15, cz);
        // Ceiling
        addBox(w, 0.3, d, ceilingMat, cx, Y + H + 0.15, cz);

        // North wall (z = z2, higher z)
        if (!openings.north) {
            addBox(w + W, H, W, concreteMat, cx, HH, z2 + W / 2, true);
        } else {
            const [oStart, oEnd] = openings.north; // x range of opening
            if (oStart > x1) addBox(oStart - x1, H, W, concreteMat, (x1 + oStart) / 2, HH, z2 + W / 2, true);
            if (oEnd < x2) addBox(x2 - oEnd, H, W, concreteMat, (oEnd + x2) / 2, HH, z2 + W / 2, true);
        }
        // South wall (z = z1, lower z)
        if (!openings.south) {
            addBox(w + W, H, W, concreteMat, cx, HH, z1 - W / 2, true);
        } else {
            const [oStart, oEnd] = openings.south;
            if (oStart > x1) addBox(oStart - x1, H, W, concreteMat, (x1 + oStart) / 2, HH, z1 - W / 2, true);
            if (oEnd < x2) addBox(x2 - oEnd, H, W, concreteMat, (oEnd + x2) / 2, HH, z1 - W / 2, true);
        }
        // West wall (x = x1)
        if (!openings.west) {
            addBox(W, H, d + W, concreteMat, x1 - W / 2, HH, cz, true);
        } else {
            const [oStart, oEnd] = openings.west; // z range of opening
            if (oStart > z1) addBox(W, H, oStart - z1, concreteMat, x1 - W / 2, HH, (z1 + oStart) / 2, true);
            if (oEnd < z2) addBox(W, H, z2 - oEnd, concreteMat, x1 - W / 2, HH, (oEnd + z2) / 2, true);
        }
        // East wall (x = x2)
        if (!openings.east) {
            addBox(W, H, d + W, concreteMat, x2 + W / 2, HH, cz, true);
        } else {
            const [oStart, oEnd] = openings.east;
            if (oStart > z1) addBox(W, H, oStart - z1, concreteMat, x2 + W / 2, HH, (z1 + oStart) / 2, true);
            if (oEnd < z2) addBox(W, H, z2 - oEnd, concreteMat, x2 + W / 2, HH, (oEnd + z2) / 2, true);
        }
    }

    // Pipe along X axis WITH collider
    function addPipeX(y, x1, x2, z, mat, radius = 0.08) {
        const len = Math.abs(x2 - x1);
        const cx = (x1 + x2) / 2;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 12), mat);
        p.position.set(cx, y, z);
        p.rotation.z = Math.PI / 2;
        p.castShadow = true;
        scene.add(p);
    }

    // Pipe along Z axis WITH collider
    function addPipeZ(y, z1, z2, x, mat, radius = 0.08) {
        const len = Math.abs(z2 - z1);
        const cz = (z1 + z2) / 2;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 12), mat);
        p.position.set(x, y, cz);
        p.castShadow = true;
        scene.add(p);
    }

    // Big pipe WITH a box collider so player cannot walk through
    function addBigPipeX(y, x1, x2, z, mat, radius = 0.25) {
        const len = Math.abs(x2 - x1);
        const cx = (x1 + x2) / 2;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 16), mat);
        p.position.set(cx, y, z);
        p.rotation.z = Math.PI / 2;
        p.castShadow = true;
        scene.add(p);
        // Box collider for the pipe
        const box = new THREE.Box3();
        box.setFromCenterAndSize(
            new THREE.Vector3(cx, y, z),
            new THREE.Vector3(len, radius * 2, radius * 2)
        );
        colliders.push(box);
    }

    function addBigPipeZ(y, z1, z2, x, mat, radius = 0.25) {
        const len = Math.abs(z2 - z1);
        const cz = (z1 + z2) / 2;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 16), mat);
        p.position.set(x, y, cz);
        p.castShadow = true;
        scene.add(p);
        // Box collider
        const box = new THREE.Box3();
        box.setFromCenterAndSize(
            new THREE.Vector3(x, y, cz),
            new THREE.Vector3(radius * 2, radius * 2, len)
        );
        colliders.push(box);
    }

    function makeNote(x, y, z, content, promptText) {
        const noteMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 0.4),
            new THREE.MeshStandardMaterial({
                color: 0xd4c9a8, emissive: 0x332200, emissiveIntensity: 0.15,
                side: THREE.DoubleSide
            })
        );
        noteMesh.position.set(x, y, z);
        noteMesh.rotation.x = -0.2;
        noteMesh.userData = { interactable: true, type: 'note', content, promptText };
        scene.add(noteMesh);
        interactableObjects.push(noteMesh);
        return noteMesh;
    }

    // ══════════════════════════════════════════════
    //  SECTION 1: ENTRY SHAFT — directly below the hatch
    //  x[-15..-11] z[-28..-24]
    //  Opening SOUTH into main tunnel
    // ══════════════════════════════════════════════
    buildRoom(-15, -11, -28, -24, {
        south: [-14, -12]  // Opening south into main tunnel
    });

    // Ladder from hatch (visual only)
    const ladderMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 });
    for (let i = 0; i < 6; i++) {
        addBox(0.6, 0.04, 0.04, ladderMat, -13, Y + 0.3 + i * 0.5, -24.2);
    }
    addBox(0.04, 3.2, 0.04, ladderMat, -13.28, Y + 1.6, -24.2);
    addBox(0.04, 3.2, 0.04, ladderMat, -12.72, Y + 1.6, -24.2);

    // Dim entry light
    const entryLight = new THREE.PointLight(0xffaa44, 0.5, 8);
    entryLight.position.set(-13, Y + 2.8, -26);
    scene.add(entryLight);

    // ══════════════════════════════════════════════
    //  SECTION 2: MAIN EAST-WEST TUNNEL
    //  x[-15..18] z[-32..-28]  (4 units wide)
    //  Openings: NORTH at entry shaft, SOUTH at steam chamber & valve room connector
    // ══════════════════════════════════════════════
    // Floor + ceiling
    const mW = 33, mCX = 1.5;
    addBox(mW, 0.3, 4, floorMat, mCX, Y - 0.15, -30);
    addBox(mW, 0.3, 4, ceilingMat, mCX, Y + H + 0.15, -30);

    // North wall segments around entry shaft opening [-14,-12]
    addBox(1, H, W, concreteMat, -14.5, HH, -28 + W / 2, true);   // x[-15..-14]
    addBox(30, H, W, concreteMat, 3, HH, -28 + W / 2, true);      // x[-12..18]

    // South wall with TWO openings: steam chamber [-4, 0] and connector [10, 12]
    addBox(11, H, W, concreteMat, -9.5, HH, -32 - W / 2, true);    // x[-15..-4]
    addBox(10, H, W, concreteMat, 5, HH, -32 - W / 2, true);       // x[0..10]
    addBox(6, H, W, concreteMat, 15, HH, -32 - W / 2, true);       // x[12..18]

    // West wall (sealed end)
    addBox(W, H, 4 + W, concreteMat, -15 - W / 2, HH, -30, true);
    // East wall (sealed end)
    addBox(W, H, 4 + W, concreteMat, 18 + W / 2, HH, -30, true);

    // Ceiling-mounted pipes WITH colliders
    addBigPipeX(Y + 3.4, -14, 17, -29, pipeMat, 0.3);
    addBigPipeX(Y + H - 0.3, -14, 17, -31, rustPipeMat, 0.2);

    // Smaller pipes (visual, no collider — above head height)
    addPipeX(Y + H - 0.5, -14, 17, -28.5, pipeMat);
    addPipeX(Y + H - 0.6, -14, 17, -31.5, pipeMat);

    // Floor grates
    for (let i = 0; i < 6; i++) {
        addBox(1.5, 0.02, 0.5, grillMat, -10 + i * 5, Y + 0.11, -30);
    }

    // Dim tunnel lights (sparse)
    const tunnelLightPositions = [-10, -2, 6, 14];
    tunnelLightPositions.forEach(x => {
        const light = new THREE.PointLight(0xff6622, 0.4, 7);
        light.position.set(x, Y + 2.8, -30);
        scene.add(light);
        addBox(0.25, 0.15, 0.15, metalMat, x, Y + 2.9, -28.3);
    });

    // Water puddles
    const puddleMat = new THREE.MeshStandardMaterial({
        color: 0x111122, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.6
    });
    [[-8, -30.5], [3, -29.5], [10, -31], [17, -30]].forEach(([px, pz]) => {
        const puddle = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.8), puddleMat);
        puddle.position.set(px, Y + 0.11, pz);
        puddle.rotation.x = -Math.PI / 2;
        scene.add(puddle);
    });

    // Note in main tunnel
    makeNote(-6, Y + 0.6, -29,
        "MAINTENANCE LOG — ENTRY 47\nDate: December 14, 2024\n\nCooling system running at 340% capacity for no reason. Server Core is pulling more power than physically possible.\n\nI reported it. Management said to 'leave it alone.'\n\nThe pipes are making sounds. Not mechanical sounds. More like... breathing.\n\n- R. Torres, Lead Maintenance",
        'Read Maintenance Log');

    // ══════════════════════════════════════════════
    //  STEAM HAZARDS (in main tunnel)
    // ══════════════════════════════════════════════
    const steamBursts = [];
    const steamPositions = [
        { x: -3, z: -28.4, dir: 'south' },
        { x: 5, z: -31.6, dir: 'north' },
        { x: 12, z: -28.4, dir: 'south' },
    ];

    steamPositions.forEach(({ x, z, dir }) => {
        addBox(0.12, 0.12, 0.25, rustPipeMat, x, Y + 1.0, z);
        const steamCloud = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.5, 0.4),
            steamMat.clone()
        );
        steamCloud.position.set(x, Y + 1.2, dir === 'south' ? z + 0.5 : z - 0.5);
        scene.add(steamCloud);
        const steamLight = new THREE.PointLight(0xffffff, 0.2, 3);
        steamLight.position.set(x, Y + 1.5, z);
        scene.add(steamLight);
        steamBursts.push({
            position: new THREE.Vector3(x, Y + 1, z + (dir === 'south' ? 0.5 : -0.5)),
            radius: 1.2,
            cloud: steamCloud,
            light: steamLight,
            timer: Math.random() * 6,
            active: false,
        });
    });

    // ══════════════════════════════════════════════
    //  SECTION 3: STEAM CHAMBER  x[-5..1] z[-38..-32]
    //  Large room with massive cooling machinery
    //  Opening NORTH into main tunnel
    // ══════════════════════════════════════════════
    buildRoom(-5, 1, -38, -32, {
        north: [-4, 0]   // connects to main tunnel
    });

    // Massive cooling unit (center of room)
    const coolingMat = TextureFactory.createMetalMaterial({ color: [40, 50, 60], roughness: 0.3, metalness: 0.85 });
    addBox(2.5, 2.5, 2.5, coolingMat, -2, Y + 1.25, -35, true);
    // Cooling unit vents
    for (let i = 0; i < 3; i++) {
        addBox(2.3, 0.06, 0.06, grillMat, -2, Y + 0.5 + i * 0.7, -33.7);
    }
    // Cooling unit light
    const coolingLight = new THREE.PointLight(0x2244ff, 0.8, 8);
    coolingLight.position.set(-2, Y + 2.5, -35);
    scene.add(coolingLight);

    // Pipes along walls (with colliders)
    addBigPipeZ(Y + 2.5, -38, -32, -4.5, pipeMat, 0.3);
    addBigPipeZ(Y + 2.5, -38, -32, 0.5, pipeMat, 0.3);

    // Ambient steam in chamber
    for (let i = 0; i < 3; i++) {
        const fogCloud = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 6, 6),
            new THREE.MeshStandardMaterial({
                color: 0xaaaaaa, transparent: true, opacity: 0.06, side: THREE.DoubleSide
            })
        );
        fogCloud.position.set(-2 + (Math.random() - 0.5) * 3, Y + 1 + Math.random(), -35 + (Math.random() - 0.5) * 4);
        scene.add(fogCloud);
    }

    // Story note
    makeNote(-4.5, Y + 0.6, -36,
        "INCIDENT REPORT — COOLING FAILURE\nDate: December 15, 2024, 00:47 AM\n\nCooling Unit #3 failed at midnight. Temperature in Server Core spiked to 92°C.\n\nBut the servers didn't shut down. They ran FASTER.\n\nI tried to restart the cooling manually but the valves won't respond. It's like the system is fighting me.\n\nUpdate 01:15 AM: The cooling unit just restarted on its own. Nobody touched it.\n\nUpdate 01:32 AM: The temperature is now 12°C. BELOW ZERO. That's not possible.\n\n- R. Torres",
        'Read Incident Report');

    // Room lights
    const chamberLight = new THREE.PointLight(0xff4411, 0.3, 6);
    chamberLight.position.set(-2, Y + 2.5, -33);
    scene.add(chamberLight);

    // ══════════════════════════════════════════════
    //  SECTION 4: CONNECTOR — main tunnel to valve room
    //  x[9..13] z[-34..-32]  (short hallway south)
    //  This makes the opening from the main tunnel into the valve room
    // ══════════════════════════════════════════════
    buildRoom(9, 13, -34, -32, {
        north: [10, 12],  // connects to main tunnel
        south: [10, 12],  // connects to valve room
    });

    // ══════════════════════════════════════════════
    //  SECTION 5: VALVE ROOM  x[8..14] z[-40..-34]
    //  Power routing puzzle — turn 3 valves to restore power
    //  Opening NORTH via connector
    // ══════════════════════════════════════════════
    buildRoom(8, 14, -40, -34, {
        north: [10, 12],   // connects to connector
        east: [-38, -36],  // opening to exit tunnel
    });

    // Pipe network on walls (with colliders — can't walk through)
    addBigPipeZ(Y + 1, -40, -34, 8.8, pipeMat, 0.15);
    addBigPipeZ(Y + 1, -40, -34, 13.2, pipeMat, 0.15);

    // Smaller pipes above (no collider)
    addPipeZ(Y + 2, -40, -34, 8.8, rustPipeMat);
    addPipeZ(Y + 2, -40, -34, 13.2, rustPipeMat);
    addPipeX(Y + 1.5, 8, 14, -39.5, pipeMat);
    addPipeX(Y + 2.5, 8, 14, -34.5, pipeMat);

    // ── THREE VALVES ──
    const valves = [];
    const valvePositions = [
        { x: 9.5, z: -36, label: 'COOLANT PUMP A' },
        { x: 11, z: -38, label: 'MAIN PRESSURE LINE' },
        { x: 12.5, z: -39.5, label: 'EMERGENCY BYPASS' },
    ];

    valvePositions.forEach(({ x, z, label }, idx) => {
        // Valve wheel
        const wheel = new THREE.Mesh(
            new THREE.TorusGeometry(0.25, 0.04, 8, 16),
            valveMat.clone()
        );
        wheel.position.set(x, Y + 1.3, z);
        wheel.rotation.x = Math.PI / 2;
        scene.add(wheel);

        // Valve center shaft
        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8),
            metalMat
        );
        shaft.position.set(x, Y + 1.3, z);
        scene.add(shaft);

        // Panel behind valve
        addBox(0.8, 0.6, 0.08, metalMat, x, Y + 1.3, z + 0.15);

        // Status indicator (red = off)
        const indicMat = new THREE.MeshStandardMaterial({
            color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0
        });
        const indicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 8, 8),
            indicMat
        );
        indicator.position.set(x + 0.25, Y + 1.5, z + 0.2);
        scene.add(indicator);

        // Valve trigger
        const trigger = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 0.5),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        trigger.position.set(x, Y + 1.3, z);
        trigger.userData = {
            interactable: true,
            type: 'valve',
            promptText: `Turn Valve — ${label}`,
            valveIndex: idx,
            turned: false,
            wheel,
            indicator,
            indicMat,
        };
        scene.add(trigger);
        interactableObjects.push(trigger);
        valves.push(trigger);
    });

    // Valve room lights
    const valveLight1 = new THREE.PointLight(0xff6622, 0.4, 6);
    valveLight1.position.set(11, Y + 2.8, -36);
    scene.add(valveLight1);
    const valveLight2 = new THREE.PointLight(0xff6622, 0.3, 6);
    valveLight2.position.set(11, Y + 2.8, -39);
    scene.add(valveLight2);

    // Story terminal
    const puzzleTerminal = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.5, 0.3),
        new THREE.MeshStandardMaterial({
            color: 0x0a0a0a, emissive: 0x003310, emissiveIntensity: 0.5
        })
    );
    puzzleTerminal.position.set(13, Y + 1.0, -35);
    puzzleTerminal.userData = {
        interactable: true,
        type: 'terminal',
        promptText: 'Read Terminal',
        content: ">> VALVE CONTROL SYSTEM v2.4\n>> STATUS: OFFLINE\n\nTo restore emergency lighting and unseal exit:\n\n1. Turn COOLANT PUMP A\n2. Turn MAIN PRESSURE LINE\n3. Turn EMERGENCY BYPASS\n\nWARNING: System may behave unpredictably.\nWARNING: Do not look at the core.\nWARNING: If you hear breathing... run."
    };
    scene.add(puzzleTerminal);
    interactableObjects.push(puzzleTerminal);
    // Terminal glow
    const termGlow = new THREE.PointLight(0x00ff44, 0.3, 3);
    termGlow.position.set(13, Y + 1.3, -35);
    scene.add(termGlow);

    // ══════════════════════════════════════════════
    //  SECTION 6: EXIT TUNNEL  x[14..20] z[-38..-34]
    //  Sealed until puzzle solved
    //  Opening WEST from valve room
    // ══════════════════════════════════════════════
    buildRoom(14, 20, -38, -34, {
        west: [-38, -36],  // connects to valve room
    });

    // Sealed exit door (at east end x=20)
    const exitDoorMat = new THREE.MeshStandardMaterial({
        color: 0x333340, roughness: 0.3, metalness: 0.8
    });
    const exitDoor = addBox(0.4, 3.0, 3.5, exitDoorMat, 19.8, HH, -36, true);
    const exitDoorColliderIdx = colliders.length - 1;

    // Exit door indicator (red = sealed)
    const exitIndicMat = new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0
    });
    const exitIndicator = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        exitIndicMat
    );
    exitIndicator.position.set(19.5, Y + 2.5, -36);
    scene.add(exitIndicator);

    // Warning stripes
    addBox(0.05, 0.1, 3.3, hazardMat, 19.7, Y + 0.3, -36);
    addBox(0.05, 0.1, 3.3, hazardMat, 19.7, Y + 2.9, -36);

    // Exit light (off until puzzle solved)
    const exitLight = new THREE.PointLight(0x00ff44, 0, 0);
    exitLight.position.set(19, Y + 2, -36);
    scene.add(exitLight);

    // Hazard sign
    addBox(0.5, 0.3, 0.02, hazardMat, 16, Y + 2.2, -34.2);

    return {
        colliders,
        interactableObjects,
        steamBursts,
        valves,
        exitDoor,
        exitDoorColliderIdx,
        exitIndicator,
        exitIndicMat,
        exitLight,
    };
}
