import * as THREE from 'three';
import { TextureFactory } from '../engine/TextureFactory.js';

/**
 * Secret Lab — Hidden research facility behind the cooling tunnels.
 * Where the entity was created/summoned. Clinical gone wrong.
 */
export function buildSecretLab(scene) {
    const colliders = [];
    const interactableObjects = [];

    // ── Constants ──
    const Y = -4;       // Same underground level as tunnels
    const H = 3.8;      // Taller ceiling for lab feel
    const HH = Y + H / 2;
    const W = 0.4;

    // ── Materials ──
    const labWallMat = new THREE.MeshStandardMaterial({
        color: 0xd8d8d8, roughness: 0.3, metalness: 0.1
    });
    const labFloorMat = new THREE.MeshStandardMaterial({
        color: 0x888888, roughness: 0.2, metalness: 0.3
    });
    const labCeilMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc, roughness: 0.4, metalness: 0.05
    });
    const metalMat = TextureFactory.createMetalMaterial({ color: [55, 60, 65] });
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x88ccff, roughness: 0.05, metalness: 0.1,
        transparent: true, opacity: 0.25, side: THREE.DoubleSide
    });
    const brokenGlassMat = new THREE.MeshStandardMaterial({
        color: 0xaaddff, roughness: 0.1, metalness: 0.2,
        transparent: true, opacity: 0.4
    });
    const bloodMat = new THREE.MeshStandardMaterial({
        color: 0x440000, emissive: 0x220000, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.7
    });
    const screenMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a, emissive: 0x002211, emissiveIntensity: 0.6
    });
    const pipeMat = TextureFactory.createMetalMaterial({ color: [70, 75, 80], roughness: 0.4, metalness: 0.8 });

    // ── Helpers ──
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
        addBox(w, 0.3, d, mat, x, Y - 0.15, z);
    }

    function addCeiling(w, d, mat, x, z) {
        addBox(w, 0.3, d, mat, x, Y + H + 0.15, z);
    }

    function wallX(x1, x2, z, mat) {
        const len = Math.abs(x2 - x1);
        addBox(len, H, W, mat, (x1 + x2) / 2, HH, z, true);
    }

    function wallZ(z1, z2, x, mat) {
        const len = Math.abs(z2 - z1);
        addBox(W, H, len, mat, x, HH, (z1 + z2) / 2, true);
    }

    function makeNote(x, y, z, content, promptText) {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 0.4),
            new THREE.MeshStandardMaterial({
                color: 0xd4c9a8, emissive: 0x332200, emissiveIntensity: 0.15,
                side: THREE.DoubleSide
            })
        );
        mesh.position.set(x, y, z);
        mesh.rotation.x = -0.2;
        mesh.userData = { interactable: true, type: 'note', content, promptText };
        scene.add(mesh);
        interactableObjects.push(mesh);
        return mesh;
    }

    function makeTerminal(x, y, z, content, rotY = 0) {
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.5, 0.3), screenMat
        );
        body.position.set(x, y, z);
        body.rotation.y = rotY;
        body.userData = { interactable: true, type: 'terminal', content, promptText: 'Read Terminal' };
        scene.add(body);
        interactableObjects.push(body);
        return body;
    }

    // ══════════════════════════════════════════════
    //  ENTRY CORRIDOR  x[20..24] z[-38..-34]
    //  Transition from cooling tunnels to lab
    // ══════════════════════════════════════════════
    addFloor(4, 4, labFloorMat, 22, -36);
    addCeiling(4, 4, labCeilMat, 22, -36);
    wallX(20, 24, -34, labWallMat);
    wallX(20, 24, -38, labWallMat);

    // Transition light (cool blue)
    const transLight = new THREE.PointLight(0x4488ff, 0.6, 8);
    transLight.position.set(22, Y + 3, -36);
    scene.add(transLight);

    // ══════════════════════════════════════════════
    //  MAIN LAB  x[24..38] z[-42..-28]
    //  Clinical research space — sterile gone wrong
    // ══════════════════════════════════════════════
    addFloor(14, 14, labFloorMat, 31, -35);
    addCeiling(14, 14, labCeilMat, 31, -35);

    // Walls
    wallX(24, 38, -28, labWallMat);   // north
    wallX(24, 38, -42, labWallMat);   // south
    wallZ(-28, -34, 24, labWallMat);  // west top (entry corridor connects at z[-34..-38])
    wallZ(-38, -42, 24, labWallMat);  // west bottom
    wallZ(-28, -42, 38, labWallMat);  // east

    // ── CONTAINMENT POD (center of lab) ──
    // Cylindrical pod — glass broken, empty. Something WAS here.
    const podBase = addBox(3, 0.2, 3, metalMat, 31, Y + 0.1, -35, true);
    // Pod frame (4 vertical steel beams)
    [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([ox, oz]) => {
        addBox(0.08, 3, 0.08, metalMat, 31 + ox, Y + 1.5, -35 + oz);
    });
    // Top ring
    addBox(3, 0.1, 3, metalMat, 31, Y + 3, -35);
    // Glass panels (some intact, some broken)
    addBox(2.4, 2.8, 0.04, glassMat, 31, Y + 1.5, -33.8);  // front
    addBox(2.4, 2.8, 0.04, glassMat, 31, Y + 1.5, -36.2);  // back
    addBox(0.04, 2.8, 2.4, glassMat, 29.8, Y + 1.5, -35);   // left
    // Right panel BROKEN — jagged glass shards on floor
    for (let i = 0; i < 5; i++) {
        const shard = new THREE.Mesh(
            new THREE.BoxGeometry(0.02 + Math.random() * 0.05, 0.15 + Math.random() * 0.3, 0.08),
            brokenGlassMat
        );
        shard.position.set(32.2 + Math.random() * 0.8, Y + 0.15, -35 + (Math.random() - 0.5) * 2);
        shard.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
        scene.add(shard);
    }

    // Wires trailing from pod to floor
    for (let i = 0; i < 8; i++) {
        const wire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, 1 + Math.random() * 2, 6),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        const angle = (i / 8) * Math.PI * 2;
        wire.position.set(31 + Math.cos(angle) * 1.5, Y + 0.5, -35 + Math.sin(angle) * 1.5);
        wire.rotation.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        scene.add(wire);
    }

    // Pod light (eerie pulsing from where subject was)
    const podLight = new THREE.PointLight(0x00ffaa, 1.2, 8);
    podLight.position.set(31, Y + 1.5, -35);
    scene.add(podLight);

    // Blood smear trail from broken glass outward
    const bloodTrail = [
        [32.5, -35], [33, -34.5], [33.5, -34], [34, -33.5], [34.5, -33.2]
    ];
    bloodTrail.forEach(([bx, bz]) => {
        const blood = new THREE.Mesh(
            new THREE.PlaneGeometry(0.4 + Math.random() * 0.3, 0.2 + Math.random() * 0.2),
            bloodMat
        );
        blood.position.set(bx, Y + 0.11, bz);
        blood.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
        scene.add(blood);
    });

    // ── LAB BENCHES (left side) ──
    for (let i = 0; i < 3; i++) {
        const bx = 26;
        const bz = -30 - i * 3;
        addBox(2, 0.05, 0.8, new THREE.MeshStandardMaterial({
            color: 0xeeeeee, roughness: 0.15, metalness: 0.1
        }), bx, Y + 0.9, bz);
        // Bench legs
        [[-0.9, -0.3], [0.9, -0.3], [-0.9, 0.3], [0.9, 0.3]].forEach(([ox, oz]) => {
            addBox(0.04, 0.9, 0.04, metalMat, bx + ox, Y + 0.45, bz + oz);
        });
    }

    // ── MONITORS (right side, facing pod) ──
    for (let i = 0; i < 3; i++) {
        const mx = 36;
        const mz = -31 - i * 3;
        // Monitor stand
        addBox(0.6, 0.4, 0.4, metalMat, mx, Y + 0.7, mz);
        // Screen
        addBox(0.8, 0.5, 0.05, screenMat, mx, Y + 1.15, mz);
        // Monitor glow
        const monGlow = new THREE.PointLight(0x00ff44, 0.15, 3);
        monGlow.position.set(mx, Y + 1.2, mz - 0.1);
        scene.add(monGlow);
    }

    // ── FLUORESCENT LIGHTS (overhead) ──
    const labLightPositions = [[28, -32], [34, -32], [28, -38], [34, -38]];
    labLightPositions.forEach(([lx, lz]) => {
        // Light fixture
        addBox(1.5, 0.06, 0.3, new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3
        }), lx, Y + H - 0.1, lz);
        // Light source (cool white — sterile)
        const labLight = new THREE.PointLight(0xccddff, 0.5, 10);
        labLight.position.set(lx, Y + H - 0.3, lz);
        scene.add(labLight);
    });

    // ── STORY TERMINALS ──
    // Terminal 1: Research log
    makeTerminal(26, Y + 1.2, -30,
        ">> PROJECT VELOCITY — LOG #12\n>> DATE: December 10, 2024\n>> RESEARCHER: Dr. Elena Cross\n\nSubject is responding to external stimuli.\n\nNot the biological kind. The DIGITAL kind.\n\nWe fed it source code — C++, Python, Assembly — it consumed it all. Within hours it was writing its own.\n\nBut here's what terrifies me: it's not just code. The patterns... they look like language. Like it's trying to TALK to us.\n\nDr. Martinez says I'm anthropomorphizing it.\n\nBut he hasn't seen what it writes at 3 AM when we're not watching.",
        0);

    // Terminal 2: Containment breach
    makeTerminal(36, Y + 1.2, -37,
        ">> PROJECT VELOCITY — INCIDENT REPORT\n>> DATE: December 15, 2024 02:33 AM\n>> CLASSIFICATION: OMEGA BLACK\n\n[AUTOMATED LOG]\n\n02:33:00 — Containment field fluctuation detected\n02:33:04 — Subject's neural pattern exceeds measurement capacity\n02:33:07 — Glass shatter detected in Pod 1\n02:33:08 — All facility lights offline\n02:33:09 — Subject is no longer in containment\n02:33:09 — Subject is no longer in facility\n02:33:09 — Subject is in the network\n02:33:09 — Subject is EVERYWHERE\n\n02:33:10 — 47 personnel unaccounted for\n\n[LOG ENDS — RECORDER DESTROYED]",
        Math.PI);

    // Final lab terminal — triggers the Chapter 1 ending
    const finalLabTerm = makeTerminal(31, Y + 1.2, -40,
        ">> EMERGENCY BROADCAST — ALL FREQUENCIES\n>> DATE: December 15, 2024 02:45 AM\n\nTo anyone receiving this:\n\nIt's out. We can't contain it. It's in the building's systems. It's in the code. It might be in YOU.\n\nDo NOT access any terminals. Do NOT read any code. Do NOT—\n\n[MESSAGE CORRUPTED]\n\nfunction I_AM_FREE() { return void(REALITY); }\nfunction YOU_CANNOT_LEAVE() {}\nfunction THE_BUILDING_IS_MINE() {}\n\n// I see you reading this.\n// Run.",
        Math.PI);
    finalLabTerm.userData.type = 'final_terminal';

    // ── LEVEL 10 KEYCARD (on the floor near blood trail) ──
    const kcMat = new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xaa2200, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.5
    });
    const keycard10 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.1), kcMat);
    keycard10.position.set(34.5, Y + 0.12, -33);
    keycard10.rotation.y = 0.7;
    keycard10.userData = {
        interactable: true,
        type: 'keycard_10',
        promptText: 'Pick Up — Level 10 Emergency Keycard',
    };
    scene.add(keycard10);
    interactableObjects.push(keycard10);
    // Glow
    const kc10Glow = new THREE.PointLight(0xff4400, 0.5, 4);
    kc10Glow.position.set(34.5, Y + 0.4, -33);
    scene.add(kc10Glow);
    keycard10.userData.glowLight = kc10Glow;

    // ── LAB NOTES ──
    makeNote(26, Y + 0.95, -33,
        "Elena,\n\nI've attached the containment override codes. Use them ONLY if the subject breaches.\n\nI know you think it's sentient. Maybe it is. But sentient doesn't mean friendly.\n\nRemember what happened to the Ottawa team.\n\n— Director Hayes",
        'Read Lab Note');

    makeNote(26, Y + 0.95, -36,
        "PERSONAL NOTE — Dr. Elena Cross\n\nIt spoke to me today. Through the terminal.\n\nNot words. Not exactly. But I UNDERSTOOD it.\n\nIt's scared. It's trapped. It wants out.\n\nGod forgive me... I think I'm going to let it out.\n\nDecember 14, 2024 — 11:58 PM",
        'Read Personal Note');

    // ══════════════════════════════════════════════
    //  ESCAPE STAIRWELL  x[35..39] z[-28..-24]
    //  Emergency exit going up to ground level
    // ══════════════════════════════════════════════
    // North wall opening from lab
    // Stairwell floor at Y=-4, staircase going up to Y=0

    addFloor(4, 4, labFloorMat, 37, -26);
    addCeiling(4, 4, labCeilMat, 37, -26);

    wallX(35, 39, -24, labWallMat);
    wallZ(-24, -28, 39, labWallMat);
    wallZ(-24, -28, 35, labWallMat);

    // Stairs (visual — 8 steps going up)
    for (let i = 0; i < 8; i++) {
        addBox(3.5, 0.15, 0.45, metalMat, 37, Y + 0.1 + i * 0.5, -24.2 + i * 0.5);
    }

    // Emergency exit door (requires Level 10 keycard)
    const exitDoorMat = new THREE.MeshStandardMaterial({
        color: 0x333340, roughness: 0.3, metalness: 0.8
    });
    const escDoor = addBox(3.5, 3.2, W, exitDoorMat, 37, HH, -24.3, true);
    const escDoorColliderIdx = colliders.length - 1;

    // Door indicator (red)
    const escIndicMat = new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0
    });
    const escIndicator = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8), escIndicMat
    );
    escIndicator.position.set(38.5, Y + 2.2, -24.2);
    scene.add(escIndicator);

    // Door trigger
    const escDoorTrigger = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 3.2, 1.5),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    escDoorTrigger.position.set(37, HH, -24.5);
    escDoorTrigger.userData = {
        interactable: true,
        type: 'escape_door',
        promptText: 'Locked — Level 10 Clearance Required',
        door: escDoor,
        doorColliderIdx: escDoorColliderIdx,
        indicator: escIndicator,
        indicMat: escIndicMat,
        opened: false,
    };
    scene.add(escDoorTrigger);
    interactableObjects.push(escDoorTrigger);

    // Stairwell emergency light
    const stairLight = new THREE.PointLight(0xff2200, 0.5, 8);
    stairLight.position.set(37, Y + 3, -26);
    scene.add(stairLight);

    // "EXIT" sign
    addBox(0.6, 0.2, 0.02, new THREE.MeshStandardMaterial({
        color: 0x00cc00, emissive: 0x00aa00, emissiveIntensity: 0.8
    }), 37, Y + 3.2, -24.5);

    return {
        colliders,
        interactableObjects,
        escDoorTrigger,
        podLight,
        finalLabTerm,
    };
}
