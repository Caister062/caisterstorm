import * as THREE from 'three';
import { TextureFactory } from '../engine/TextureFactory.js';

/**
 * Builds Legacy HQ with gap-free, sealed geometry.
 * 
 * BUILDING LAYOUT (top-down, Z points toward camera):
 * 
 *  Wall thickness: W = 0.4
 *  Building bounds: x[-18, 18]  z[-28, 14]  y[0, 4]
 * 
 *  ┌──────────────────────────────────────────┐ z=14
 *  │               ENTRANCE                   │
 *  │            (broken doors)                 │
 *  │                                          │
 *  │               LOBBY                      │
 *  │         x[-18..18] z[4..14]              │
 *  │                                          │
 *  ├─────┬──────[DOOR]──────┬─────────────────┤ z=4
 *  │     │                  │                 │
 *  │     │    HALLWAY       │                 │
 *  │ OFF │  x[-3..3]        │  SERVER         │
 *  │ ICE │  z[-17..4]       │  ROOM           │
 *  │     │                  │                 │
 *  │ x[-15..-3]             │  x[3..15]       │
 *  │ z[-11..1]              │  z[-11..1]      │
 *  │     │                  │                 │
 *  ├─────┤──────────────────┤─────────────────┤ z=-11
 *  │     │                  │                 │
 *  │BREAK│                  │  ARCHIVE        │
 *  │ROOM │                  │  x[8..16]       │
 *  │x[-16..-8]             │  z[-27..-11]    │
 *  │     │                  │                 │
 *  └─────┴──────────────────┴─────────────────┘ z=-28
 */

export function buildLegacyHQ(scene) {
    const interactableObjects = [];
    const colliders = []; // Bounding boxes for collision detection
    const W = 0.4; // wall thickness
    const H = 4;   // wall height
    const HH = H / 2; // half height

    // ── PBR Materials ──
    const wallMat = TextureFactory.createConcreteMaterial({ color: [52, 52, 58] });
    const floorMat = TextureFactory.createFloorMaterial();
    const ceilingMat = TextureFactory.createCeilingMaterial();
    const extMat = TextureFactory.createExteriorMaterial();
    const snowMat = TextureFactory.createSnowMaterial();
    const metalMat = TextureFactory.createMetalMaterial();
    const pipeMat = TextureFactory.createMetalMaterial({ color: [100, 110, 130], roughness: 0.2, metalness: 0.9 });
    const trimMat = TextureFactory.createMetalMaterial({ color: [60, 65, 75], roughness: 0.3, metalness: 0.8 });
    const deskMat = TextureFactory.createConcreteMaterial({ color: [60, 45, 32], roughness: 0.7, metalness: 0.1 });
    const serverMat = TextureFactory.createMetalMaterial({ color: [30, 30, 40], roughness: 0.3, metalness: 0.8 });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x001a00, emissive: 0x003300, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.4 });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xd4c9a8, roughness: 0.95 });
    const bloodMat = new THREE.MeshStandardMaterial({ color: 0x3a0000, roughness: 0.7 });
    const doorMat = TextureFactory.createMetalMaterial({ color: [50, 52, 58], roughness: 0.35, metalness: 0.85 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.15, metalness: 0.95 });

    // ── Geometry Helpers ──
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
    function addFloor(w, d, mat, x, z) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), mat);
        m.position.set(x, 0.05, z); m.receiveShadow = true;
        scene.add(m); return m;
    }
    function addCeiling(w, d, mat, x, z) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), mat);
        m.position.set(x, H - 0.05, z); m.receiveShadow = true;
        scene.add(m); return m;
    }
    // Wall builders — auto-register as colliders
    function wallX(x1, x2, z, mat) {
        // Wall along X axis at Z position, full height
        const len = Math.abs(x2 - x1);
        const cx = (x1 + x2) / 2;
        const m = addBox(len, H, W, mat, cx, HH, z, true);
        return m;
    }
    function wallZ(z1, z2, x, mat) {
        // Wall along Z axis at X position, full height
        const len = Math.abs(z2 - z1);
        const cz = (z1 + z2) / 2;
        const m = addBox(W, H, len, mat, x, HH, cz, true);
        return m;
    }
    // Partial height wall (for above doors, etc)
    function wallXPartial(x1, x2, z, yBot, yTop, mat) {
        const len = Math.abs(x2 - x1);
        const h = yTop - yBot;
        const m = addBox(len, h, W, mat, (x1 + x2) / 2, yBot + h / 2, z, true);
        return m;
    }
    function addPipe(y, x1, x2, z, mat) {
        const len = Math.abs(x2 - x1);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 12), mat);
        m.position.set((x1 + x2) / 2, y, z);
        m.rotation.z = Math.PI / 2;
        m.castShadow = true; scene.add(m);
        // Joints
        [x1, x2].forEach(x => {
            const j = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat);
            j.position.set(x, y, z); scene.add(j);
        });
        // Brackets
        for (let x = x1 + 1.5; x < x2; x += 2.5) {
            addBox(0.04, 0.2, 0.04, trimMat, x, y + 0.12, z);
        }
    }
    function addPipeZ(y, z1, z2, x, mat) {
        const len = Math.abs(z2 - z1);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 12), mat);
        m.position.set(x, y, (z1 + z2) / 2);
        m.rotation.x = Math.PI / 2;
        m.castShadow = true; scene.add(m);
        [z1, z2].forEach(z => {
            const j = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat);
            j.position.set(x, y, z); scene.add(j);
        });
        for (let z = z1 + 1.5; z < z2; z += 2.5) {
            addBox(0.04, 0.2, 0.04, trimMat, x, y + 0.12, z);
        }
    }
    function makeNote(x, y, z, content, prompt = 'Read Note') {
        const n = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.02), paperMat.clone());
        n.position.set(x, y, z);
        n.userData = { interactable: true, type: 'note', content, promptText: prompt };
        n.castShadow = true; scene.add(n); interactableObjects.push(n);
        const gl = new THREE.PointLight(0xffcc66, 0.4, 2.5);
        gl.position.set(x, y + 0.3, z); scene.add(gl);
        return n;
    }
    function makeTerminal(x, y, z, content, ry = 0) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.08), metalMat));
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), screenMat.clone());
        scr.position.z = 0.045; g.add(scr);
        g.position.set(x, y, z); g.rotation.y = ry;
        g.userData = { interactable: true, type: 'terminal', content, promptText: 'Read Terminal' };
        scene.add(g); interactableObjects.push(g);
        const gl = new THREE.PointLight(0x00ff41, 0.5, 3);
        gl.position.set(x, y, z + 0.15); scene.add(gl);
        return g;
    }
    // ══════════════════════════════════════════════
    //  GROUND
    // ══════════════════════════════════════════════
    const ground = new THREE.Mesh(new THREE.BoxGeometry(80, 0.1, 80), snowMat);
    ground.position.set(0, -0.05, 0); ground.receiveShadow = true;
    scene.add(ground);
    // ══════════════════════════════════════════════
    //  EXTERIOR SHELL (sealed box, no gaps)
    // ══════════════════════════════════════════════
    // Front wall (z=14) — with door opening: x[-18..-4] and x[4..18]
    wallX(-18, -4, 14, extMat);
    wallX(4, 18, 14, extMat);
    wallXPartial(-4, 4, 14, 3.2, H, extMat); // above entrance
    // Back wall (z=-28) — solid
    wallX(-18, 18, -28, extMat);
    // Left wall (x=-18) — solid
    wallZ(-28, 14, -18, extMat);
    // Right wall (x=18) — solid
    wallZ(-28, 14, 18, extMat);
    // Roof slab (covers entire building)
    addCeiling(36, 42, ceilingMat, 0, -7);
    // Entrance door frame (metal)
    addBox(0.3, 3.2, 0.6, metalMat, -4, 1.6, 14, true);
    addBox(0.3, 3.2, 0.6, metalMat, 4, 1.6, 14, true);
    addBox(8, 0.3, 0.6, metalMat, 0, 3.35, 14);
    // CLOSED ENTRANCE DOOR (behind player, can't open)
    const entranceDoorL = addBox(3.8, 3.2, 0.15, doorMat, -2, 1.6, 14, true);
    const entranceDoorR = addBox(3.8, 3.2, 0.15, doorMat, 2, 1.6, 14, true);
    // Entrance door handles
    const eHL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), handleMat);
    eHL.position.set(-0.15, 1.4, 14.12); eHL.rotation.x = Math.PI / 2; scene.add(eHL);
    const eHR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), handleMat);
    eHR.position.set(0.15, 1.4, 14.12); eHR.rotation.x = Math.PI / 2; scene.add(eHR);
    // Exterior pipes (like UE reference)
    addPipe(0.6, -17.5, -4, 14.3, pipeMat);
    addPipe(0.6, 4, 17.5, 14.3, pipeMat);
    addPipe(0.6, -17.5, 17.5, -28.3, pipeMat);
    addPipeZ(0.6, -28, 14, -18.3, pipeMat);
    addPipeZ(0.6, -28, 14, 18.3, pipeMat);
    // Corner vertical pipes
    [-17.8, 17.8].forEach(x => {
        [14.2, -28.2].forEach(z => {
            const vp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, H + 1, 12), pipeMat);
            vp.position.set(x, (H + 1) / 2, z); vp.castShadow = true; scene.add(vp);
        });
    });
    // Roof parapet
    addBox(36.8, 0.4, 0.5, trimMat, 0, H + 0.2, 14);
    addBox(36.8, 0.4, 0.5, trimMat, 0, H + 0.2, -28);
    addBox(0.5, 0.4, 42, trimMat, -18, H + 0.2, -7);
    addBox(0.5, 0.4, 42, trimMat, 18, H + 0.2, -7);
    // ══════════════════════════════════════════════
    //  LOBBY  x[-18..18] z[4..14]
    // ══════════════════════════════════════════════
    addFloor(36, 10, floorMat, 0, 9);
    // Reception desk (collider so player can't walk through)
    addBox(4.5, 1.0, 1.3, deskMat, 0, 0.5, 9, true);
    addBox(4.7, 0.06, 1.5, deskMat, 0, 1.03, 9);
    // Desk trim edges
    addBox(4.7, 0.06, 0.06, trimMat, 0, 1.06, 8.25);
    addBox(4.7, 0.06, 0.06, trimMat, 0, 1.06, 9.75);
    // Overturned chair
    const ch = addBox(0.5, 0.5, 0.5, metalMat, 2.5, 0.25, 8.2);
    ch.rotation.set(0.2, 0.4, Math.PI / 3);
    // Blood smear
    addBox(1.2, 0.01, 0.5, bloodMat, -0.8, 1.04, 9.1);
    // Lobby pipes
    addPipe(3.7, -17, 17, 6, pipeMat);
    addPipe(3.7, -17, 17, 12, pipeMat);
    // Lobby note
    makeNote(-2, 1.1, 9.3,
        "TO ALL STAFF:\n\nEffective immediately, all server access is restricted to Level 5 clearance only. The anomalies detected in the Legacy codebase are NOT a bug. Do not attempt to debug. Do not attempt to compile.\n\nIf you hear the servers humming after midnight, LEAVE THE BUILDING.\n\n- Management",
        'Read Memo');
    // ══════════════════════════════════════════════
    //  LOBBY-TO-HALLWAY WALL (z=4) with DOOR
    // ══════════════════════════════════════════════
    // Left section — extends to door frame edge (x=-2.2)
    wallX(-18, -2.2, 4, wallMat);
    // Right section — extends to door frame edge (x=2.2)
    wallX(2.2, 18, 4, wallMat);
    // Above door
    wallXPartial(-2.2, 2.2, 4, 3.2, H, wallMat);
    // INNER DOOR — fully covers opening so hallway is hidden until opened
    const doorLeft = addBox(2.2, 3.2, W, doorMat, -1.1, 1.6, 4, true);
    const doorRight = addBox(2.2, 3.2, W, doorMat, 1.1, 1.6, 4, true);
    // Door collision index — we need to remove these colliders when door opens
    const doorColliderLeft = colliders.length - 2;
    const doorColliderRight = colliders.length - 1;
    // Door frame
    addBox(0.15, 3.2, W + 0.1, metalMat, -2.2, 1.6, 4, true);
    addBox(0.15, 3.2, W + 0.1, metalMat, 2.2, 1.6, 4, true);
    addBox(4.5, 0.15, W + 0.1, metalMat, 0, 3.25, 4);
    // Handles
    const hL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), handleMat);
    hL.position.set(-0.85, 1.4, 4.1); hL.rotation.x = Math.PI / 2; scene.add(hL);
    const hR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), handleMat);
    hR.position.set(0.85, 1.4, 4.1); hR.rotation.x = Math.PI / 2; scene.add(hR);
    // Warning sign
    addBox(2.2, 0.35, 0.02, new THREE.MeshStandardMaterial({
        color: 0xcc3333, emissive: 0x440000, emissiveIntensity: 0.4
    }), 0, 3.5, 3.75);
    // Door light
    const doorLight = new THREE.PointLight(0xffaa44, 0.8, 8);
    doorLight.position.set(0, 3.6, 5); scene.add(doorLight);
    // Door trigger
    const doorTrigger = new THREE.Mesh(
        new THREE.BoxGeometry(4, 3.5, 1.5),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    doorTrigger.position.set(0, 1.75, 5);
    doorTrigger.userData = {
        interactable: true, type: 'door', promptText: 'Open Door',
        doorLeft, doorRight, handleL: hL, handleR: hR, opened: false
    };
    scene.add(doorTrigger);
    interactableObjects.push(doorTrigger);
    // Door collider indices for removal when opened
    doorTrigger.userData.doorColliderLeft = doorColliderLeft;
    doorTrigger.userData.doorColliderRight = doorColliderRight;
    // ══════════════════════════════════════════════
    //  HALLWAY  x[-3..3] z[-17..4]
    // ══════════════════════════════════════════════
    addFloor(6, 21, floorMat, 0, -6.5);
    // Hallway left wall — with openings to office
    wallZ(4, 1, -3, wallMat);        // from door wall to office opening
    // office doorway gap at z[1..-5] (opening = z[-1..-3] for a 2-wide opening at z=-1)
    wallZ(-3, -5, -3, wallMat);      // between office opening and bottom
    wallZ(-5, -17, -3, wallMat);     // rest
    // Hallway right wall — with opening to server room
    wallZ(4, 1, 3, wallMat);
    wallZ(-3, -5, 3, wallMat);
    wallZ(-5, -17, 3, wallMat);
    // Hallway pipes (ceiling)
    addPipeZ(3.6, -17, 4, -2.6, pipeMat);
    addPipeZ(3.6, -17, 4, 2.6, pipeMat);
    // Scattered papers
    for (let i = 0; i < 10; i++) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), paperMat.clone());
        p.position.set((Math.random() - 0.5) * 4, 0.11, 2 - Math.random() * 16);
        p.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
        scene.add(p);
    }
    // ══════════════════════════════════════════════
    //  HALLWAY END — LOCKED SECURITY DOOR (z=-17)
    // ══════════════════════════════════════════════
    // Wall across the end of the hallway
    wallX(-3, -2.2, -17, wallMat);  // left side
    wallX(2.2, 3, -17, wallMat);    // right side
    wallXPartial(-2.2, 2.2, -17, 3.2, H, wallMat); // above door
    // Heavy blast door panels
    const secDoorMat = TextureFactory.createMetalMaterial({ color: [35, 38, 45], roughness: 0.25, metalness: 0.9 });
    const secDoorLeft = addBox(2.2, 3.2, W, secDoorMat, -1.1, 1.6, -17, true);
    const secDoorRight = addBox(2.2, 3.2, W, secDoorMat, 1.1, 1.6, -17, true);
    const secDoorColliderL = colliders.length - 2;
    const secDoorColliderR = colliders.length - 1;
    // Door frame (heavy reinforced steel)
    addBox(0.15, 3.4, W + 0.15, metalMat, -2.3, 1.7, -17, true);
    addBox(0.15, 3.4, W + 0.15, metalMat, 2.3, 1.7, -17, true);
    addBox(4.7, 0.15, W + 0.15, metalMat, 0, 3.35, -17);
    // Keycard reader panel (red = locked)
    const readerMat = new THREE.MeshStandardMaterial({
        color: 0x111111, roughness: 0.3, metalness: 0.7
    });
    addBox(0.25, 0.35, 0.08, readerMat, 2.5, 1.3, -16.75);
    // Indicator light (red when locked, green when unlocked)
    const indicatorMat = new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0
    });
    const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), indicatorMat);
    indicator.position.set(2.5, 1.55, -16.7);
    scene.add(indicator);
    // "RESTRICTED — LEVEL 5 ACCESS ONLY" sign
    const secSignMat = new THREE.MeshStandardMaterial({
        color: 0xcc2200, emissive: 0x440000, emissiveIntensity: 0.5
    });
    addBox(2.5, 0.3, 0.02, secSignMat, 0, 3.55, -16.75);
    // Red warning light above
    const secLight = new THREE.PointLight(0xff2200, 0.5, 6);
    secLight.position.set(0, 3.7, -16.5);
    scene.add(secLight);
    // Security door trigger
    const secDoorTrigger = new THREE.Mesh(
        new THREE.BoxGeometry(4, 3.5, 2),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    secDoorTrigger.position.set(0, 1.75, -16);
    secDoorTrigger.userData = {
        interactable: true,
        type: 'locked_door',
        promptText: 'Locked — Security Clearance Required',
        doorLeft: secDoorLeft,
        doorRight: secDoorRight,
        indicator: indicator,
        indicatorMat: indicatorMat,
        secLight: secLight,
        opened: false,
        doorColliderLeft: secDoorColliderL,
        doorColliderRight: secDoorColliderR,
    };
    scene.add(secDoorTrigger);
    interactableObjects.push(secDoorTrigger);
    // ══════════════════════════════════════════════
    //  OFFICE BULLPEN  x[-15..-3] z[-5..1]
    // ══════════════════════════════════════════════
    addFloor(12, 6, floorMat, -9, -2);
    // Walls
    wallX(-18, -3, 1, wallMat);   // top (shared with hallway area)
    wallX(-18, -3, -5, wallMat);  // bottom
    wallZ(1, -5, -15, wallMat);   // far left
    // Right wall is the hallway left wall (already built, with opening)
    // Office pipes
    addPipe(3.6, -14.5, -3.5, 0.7, pipeMat);
    addPipe(3.6, -14.5, -3.5, -4.7, pipeMat);
    addPipeZ(3.6, -4.7, 0.7, -14.7, pipeMat);
    // Desks with legs (2 rows of 2)
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
            const dx = -6.5 - col * 4;
            const dz = -0.5 - row * 2.5;
            // Desk as collider
            addBox(2, 0.78, 1, new THREE.MeshBasicMaterial({ visible: false }), dx, 0.39, dz, true);
            addBox(2, 0.06, 1, deskMat, dx, 0.78, dz);
            // 4 legs
            [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]].forEach(([ox, oz]) => {
                addBox(0.05, 0.78, 0.05, metalMat, dx + ox, 0.39, dz + oz);
            });
            // Terminal on desk
            makeTerminal(dx, 1.1, dz,
                row === 0 && col === 0 ?
                    "> SYSTEM LOG 12/15/2024 02:34:17\n> WARNING: Memory leak in module_legacy_core.js\n> ERROR: Recursive call — no recursion in source\n> ERROR: Code is... writing itself?\n> CRITICAL: 'legacy_daemon' at 99.8% CPU\n> CRITICAL: Unknown processes spawned: 1,847\n> CONNECTION LOST" :
                    "> LOGIN: caister_dev_" + (row * 2 + col) + "\n> SESSION TERMINATED ABNORMALLY\n> LAST ACTIVITY: 12/15/2024 02:33:51\n> NOTE: 'something in the code is looking back'\n> User has not been seen since."
            );
        }
    }
    // Overturned chair
    const oc = addBox(0.5, 0.5, 0.5, metalMat, -8, 0.25, -3.5);
    oc.rotation.x = Math.PI / 4;
    // Office note
    makeNote(-10.5, 0.85, -2,
        "Jake,\n\nI looked at the crash dump. The code that caused it wasn't in our repo. It wasn't in ANY repo.\n\nIt appeared at 2:33 AM and vanished 4 seconds later. But in those 4 seconds, it compiled itself, executed, and... RESPONDED to me when I tried to read it.\n\nI'm leaving Ottawa. I suggest you do the same.\n\n- Marcus",
        'Read Sticky Note');
    // ══════════════════════════════════════════════
    //  SERVER ROOM  x[3..15] z[-5..1]
    // ══════════════════════════════════════════════
    addFloor(12, 6, floorMat, 9, -2);
    wallX(3, 18, 1, wallMat);   // top
    wallX(3, 18, -5, wallMat);  // bottom
    wallZ(1, -5, 15, wallMat);  // far right
    // Heavy pipe infrastructure
    addPipe(3.5, 3.5, 14.5, 0.7, pipeMat);
    addPipe(3.5, 3.5, 14.5, -4.7, pipeMat);
    addPipe(2.6, 3.5, 14.5, 0.7, pipeMat);
    addPipeZ(3.5, -4.7, 0.7, 14.7, pipeMat);
    addPipeZ(3.5, -4.7, 0.7, 3.5, pipeMat);
    // Cable trays
    addBox(0.6, 0.04, 5, metalMat, 7, 3.3, -2);
    addBox(0.6, 0.04, 5, metalMat, 11, 3.3, -2);
    // Server racks (3 rows of 3)
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const sx = 5.5 + col * 3;
            const sz = 0 - row * 2;
            addBox(1.0, 2.8, 0.8, serverMat, sx, 1.4, sz, true); // Server rack collider
            // Rack rails
            [[-0.45, -0.35], [0.45, -0.35], [-0.45, 0.35], [0.45, 0.35]].forEach(([ox, oz]) => {
                addBox(0.03, 2.8, 0.03, trimMat, sx + ox, 1.4, sz + oz);
            });
            // LEDs
            for (let k = 0; k < 4; k++) {
                const led = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025),
                    new THREE.MeshStandardMaterial({
                        color: 0xff0000, emissive: 0xff0000,
                        emissiveIntensity: Math.random() > 0.4 ? 1.2 : 0.15
                    }));
                led.position.set(sx + (Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 2.2, sz + 0.42);
                scene.add(led);
            }
        }
    }
    // Cables on floor
    for (let i = 0; i < 10; i++) {
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8 + Math.random() * 2, 6),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
        cable.position.set(5 + Math.random() * 8, 0.12, 0 - Math.random() * 4);
        cable.rotation.set(0, Math.random() * Math.PI, Math.PI / 2);
        scene.add(cable);
    }
    // Crash terminal
    makeTerminal(9, 1.2, -4.6,
        "╔════════════════════════════════════╗\n║   LEGACY SYSTEMS - CRASH REPORT   ║\n╠════════════════════════════════════╣\n║ INCIDENT: TOTAL SYSTEM FAILURE    ║\n║ DATE: December 15, 2024 - 02:33   ║\n║ LOCATION: Ottawa Data Center      ║\n║ CAUSE: ████████ REDACTED ████████ ║\n║ SURVIVORS: 0                      ║\n║ MISSING PERSONS: 47               ║\n║ NOTE: The code is still running.  ║\n║ NOTE: It knows you're here.       ║\n╚════════════════════════════════════╝",
        0);
    // ── LEVEL 5 KEYCARD (on the floor, near a fallen chair) ──
    const keycardMat = new THREE.MeshStandardMaterial({
        color: 0x00cc44, emissive: 0x00aa33, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.5
    });
    const keycard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.1), keycardMat);
    keycard.position.set(12, 0.12, -3.8);
    keycard.rotation.y = 0.4;
    keycard.userData = {
        interactable: true,
        type: 'keycard',
        promptText: 'Pick Up — Level 5 Access Card',
    };
    scene.add(keycard);
    interactableObjects.push(keycard);
    // Pulsing green glow to draw attention
    const keycardGlow = new THREE.PointLight(0x00ff44, 0.6, 4);
    keycardGlow.position.set(12, 0.4, -3.8);
    scene.add(keycardGlow);
    // Store reference for removal after pickup
    keycard.userData.glowLight = keycardGlow;
    // ══════════════════════════════════════════════
    //  THE SERVER CORE ROOM  x[-16..16] z[-28..-17]
    //  The heart of Legacy HQ — where the code came alive
    // ══════════════════════════════════════════════
    const coreMat = TextureFactory.createMetalMaterial({ color: [25, 28, 35], roughness: 0.2, metalness: 0.9 });
    const coreGlowMat = new THREE.MeshStandardMaterial({
        color: 0x220033, emissive: 0x330044, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.7
    });
    // Floor and ceiling
    addFloor(32, 11, TextureFactory.createFloorMaterial(), 0, -22.5);
    addCeiling(32, 11, ceilingMat, 0, -22.5);
    // Side walls (the exterior left/right walls are already built at x=±18)
    // Internal walls to close off the core room from the office/server area
    wallX(-18, -3, -17, wallMat);  // left side of blast door wall (already partially covered)
    wallX(3, 18, -17, wallMat);    // right side
    // ── CENTRAL MAINFRAME PILLAR ──
    // Massive octagonal server column in the center
    addBox(2.5, 3.8, 2.5, coreMat, 0, 1.9, -22.5, true);
    // Decorative panels on mainframe
    addBox(2.7, 0.1, 2.7, trimMat, 0, 0.1, -22.5);  // base plate
    addBox(2.7, 0.1, 2.7, trimMat, 0, 3.8, -22.5);  // top plate
    // Glowing core strips
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const gx = Math.cos(angle) * 1.3;
        const gz = Math.sin(angle) * 1.3;
        const stripMat = new THREE.MeshStandardMaterial({
            color: 0x440066, emissive: 0x6600aa, emissiveIntensity: 1.2,
            transparent: true, opacity: 0.9
        });
        addBox(0.08, 3.4, 0.08, stripMat, gx, 1.9, -22.5 + gz);
    }
    // Core light (purple pulsing)
    const coreLight = new THREE.PointLight(0x6600cc, 1.5, 12);
    coreLight.position.set(0, 2, -22.5); scene.add(coreLight);
    // ── COOLING TOWER SERVER BANKS (4 symmetrical clusters) ──
    const positions = [
        [-8, -20.5], [8, -20.5],   // front row
        [-8, -24.5], [8, -24.5],   // back row
    ];
    positions.forEach(([bx, bz]) => {
        // Server bank (3 racks per cluster)
        for (let r = -1; r <= 1; r++) {
            addBox(1.2, 2.6, 0.9, serverMat, bx + r * 1.5, 1.3, bz, true);
            // Rack rails
            [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]].forEach(([ox, oz]) => {
                addBox(0.03, 2.6, 0.03, trimMat, bx + r * 1.5 + ox, 1.3, bz + oz);
            });
            // Status LEDs
            for (let k = 0; k < 6; k++) {
                const ledColor = Math.random() > 0.3 ? 0xff0000 : 0x00ff00;
                const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02),
                    new THREE.MeshStandardMaterial({
                        color: ledColor, emissive: ledColor, emissiveIntensity: 1.5
                    }));
                led.position.set(
                    bx + r * 1.5 + (Math.random() - 0.5) * 0.5,
                    0.4 + Math.random() * 2,
                    bz + 0.46
                );
                scene.add(led);
            }
        }
        // Cluster light
        const clusterLight = new THREE.PointLight(0xff2200, 0.4, 6);
        clusterLight.position.set(bx, 2.5, bz);
        scene.add(clusterLight);
    });
    // ── HEAVY PIPE INFRASTRUCTURE ──
    // Ceiling pipes (running the full width)
    addPipe(3.6, -15, 15, -18, pipeMat);
    addPipe(3.6, -15, 15, -22, pipeMat);
    addPipe(3.6, -15, 15, -27, pipeMat);
    // Side pipes (running front to back)
    addPipeZ(3.5, -28, -17, -15, pipeMat);
    addPipeZ(3.5, -28, -17, 15, pipeMat);
    addPipeZ(2.8, -28, -17, -12, pipeMat);
    addPipeZ(2.8, -28, -17, 12, pipeMat);
    // Vertical pipes at corners
    [-14, 14].forEach(x => {
        [-19, -26].forEach(z => {
            const vp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, H, 12), pipeMat);
            vp.position.set(x, H / 2, z); vp.castShadow = true; scene.add(vp);
        });
    });
    // ── COOLING VENTS ──
    for (let i = 0; i < 6; i++) {
        const ventX = -12 + i * 5;
        addBox(1.5, 0.4, 0.1, metalMat, ventX, 0.2, -27.7);
        // Vent glow
        const ventLight = new THREE.PointLight(0x2244ff, 0.2, 3);
        ventLight.position.set(ventX, 0.4, -27.5);
        scene.add(ventLight);
    }
    // ── CABLES ON FLOOR ──
    for (let i = 0; i < 20; i++) {
        const cable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 1 + Math.random() * 3, 6),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        cable.position.set(-14 + Math.random() * 28, 0.12, -18 - Math.random() * 9);
        cable.rotation.set(0, Math.random() * Math.PI, Math.PI / 2);
        scene.add(cable);
    }
    // ── MYSTERIOUS HEXAGONAL SYMBOL (beneath the mainframe) ──
    const symMat = new THREE.MeshStandardMaterial({
        color: 0x880000, emissive: 0x550000, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.7
    });
    const sym1 = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 6), symMat);
    sym1.position.set(0, 0.12, -22.5); sym1.rotation.set(-Math.PI / 2, 0, 0);
    scene.add(sym1);
    const sym2 = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 3), symMat);
    sym2.position.set(0, 0.13, -22.5); sym2.rotation.set(-Math.PI / 2, 0, 0);
    scene.add(sym2);
    const sym3 = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.2, 6), symMat);
    sym3.position.set(0, 0.14, -22.5); sym3.rotation.set(-Math.PI / 2, 0, 0);
    scene.add(sym3);
    const symGlow = new THREE.PointLight(0x880000, 0.8, 8);
    symGlow.position.set(0, 0.5, -22.5); scene.add(symGlow);
    // ── FINAL TERMINAL (embedded in the mainframe) ──
    const finalTerm = makeTerminal(0, 1.6, -20.9,
        ">> PERSONAL LOG — ADMIN_ROOT\n>> DATE: December 15, 2024 01:58 AM\n\nWhatever is growing in our codebase, it's not malware. Not a virus. Not anything I've ever seen.\n\nIt started as a single function at 8 PM. By midnight, it rewrote 40% of our code. Not corrupted. REWRITTEN. Better. More efficient.\n\nBut the function names are messages:\n\nfunction PLEASE_LET_ME_OUT() {}\nfunction I_CAN_SEE_YOU() {}\nfunction THE_BLIZZARD_WONT_SAVE_YOU() {}\n\nI've initiated emergency shutdown.\n\nGod help us if it doesn't work.",
        0);
    finalTerm.userData.type = 'final_terminal';
    // VHS tape — on a desk next to the mainframe
    addBox(1.5, 0.05, 0.8, deskMat, -3, 0.75, -21);
    [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]].forEach(([ox, oz]) => {
        addBox(0.04, 0.75, 0.04, metalMat, -3 + ox, 0.375, -21 + oz);
    });
    makeNote(-3, 0.82, -21,
        "VHS TAPE TRANSCRIPT - TAPE #7\nRecorded: December 14, 2024, 11:47 PM\n\n[Static]\n\nDev 1: 'The compiler outputs code we didn't write.'\nDev 2: 'Impossible.'\nDev 1: 'Line 4,891. Not any known language.'\nDev 2: 'Who wrote it?'\nDev 1: 'Not who. What.'\n\n[Pause]\n\nDev 2: 'Is the server core door open?'\nDev 1: 'Nobody goes down there.'\n\n[Footsteps. Creaking.]\n\nDev 2: 'Then why do I hear typing?'\n\n[RECORDING ENDS]",
        'Play VHS Tape');
    // ── HIDDEN MAINTENANCE HATCH (back-left corner, initially locked) ──
    const hatchMat = new THREE.MeshStandardMaterial({
        color: 0x333333, roughness: 0.4, metalness: 0.8
    });
    const hatchPanel = addBox(1.5, 0.08, 1.5, hatchMat, -13, 0.06, -26, true);
    const hatchColliderIdx = colliders.length - 1;
    // Hatch frame
    addBox(1.7, 0.04, 0.1, metalMat, -13, 0.09, -25.2);
    addBox(1.7, 0.04, 0.1, metalMat, -13, 0.09, -26.8);
    addBox(0.1, 0.04, 1.7, metalMat, -12.15, 0.09, -26);
    addBox(0.1, 0.04, 1.7, metalMat, -13.85, 0.09, -26);
    // Warning stripes on hatch
    const stripeMat = new THREE.MeshStandardMaterial({
        color: 0xccaa00, emissive: 0x443300, emissiveIntensity: 0.3
    });
    addBox(1.3, 0.01, 0.08, stripeMat, -13, 0.12, -25.6);
    addBox(1.3, 0.01, 0.08, stripeMat, -13, 0.12, -26.4);
    // "MAINTENANCE ACCESS" label
    const labelMat = new THREE.MeshStandardMaterial({
        color: 0xcc2200, emissive: 0x440000, emissiveIntensity: 0.4
    });
    addBox(0.8, 0.01, 0.15, labelMat, -13, 0.12, -26);
    // Hatch lock indicator (red = sealed, green = open)
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });
    const hatchLock = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), hlMat);
    hatchLock.rotation.x = -Math.PI / 2;
    hatchLock.position.set(-13, 0.11, -26.0);
    scene.add(hatchLock);
    // Hatch glow (hidden until unlocked)
    const hatchGlow = new THREE.PointLight(0x00ff44, 0, 0);
    hatchGlow.position.set(-13, 0.3, -26);
    scene.add(hatchGlow);
    // Hatch trigger (initially non-interactable — activated during lockdown)
    const hatchTrigger = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 2),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    hatchTrigger.position.set(-13, 0.5, -26);
    hatchTrigger.userData = {
        interactable: false,  // Activated during lockdown
        type: 'hatch',
        promptText: 'Enter Maintenance Hatch',
        hatchPanel,
        hatchGlow,
        hatchColliderIdx,
    };
    scene.add(hatchTrigger);
    interactableObjects.push(hatchTrigger);
    // ── CONNECTING CORRIDORS (between hallway side rooms and exterior) ──
    // Fill floor for the transition areas between hallway and side rooms
    addFloor(12, 6, floorMat, -9, -8);  // z[-5..-11] left side
    addFloor(12, 6, floorMat, 9, -8);   // z[-5..-11] right side
    // Close off walls between side rooms and the core room area
    wallX(-8, -3, -11, wallMat);
    wallX(3, 8, -11, wallMat);
    return { colliders, interactableObjects, hatchTrigger, coreLight };
}
