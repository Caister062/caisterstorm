import * as THREE from 'three';
import { TextureFactory } from '../engine/TextureFactory.js';

/**
 * Rooftop — Open-air endgame area for Chapter 1.
 * Player emerges from stairwell into a blizzard-swept rooftop.
 * Reaching the edge triggers the Chapter 1 ending cinematic.
 */
export function buildRooftop(scene) {
    const colliders = [];
    const interactableObjects = [];

    // ── Constants ──
    const Y = 4;         // Rooftop level (above ground floor)
    const H = 0.3;       // Parapet height guide
    const W = 0.4;

    // ── Materials ──
    const roofMat = new THREE.MeshStandardMaterial({
        color: 0x444444, roughness: 0.8, metalness: 0.1
    });
    const concreteMat = TextureFactory.createConcreteMaterial({ color: [60, 62, 65] });
    const metalMat = TextureFactory.createMetalMaterial({ color: [55, 60, 65] });
    const fenceMat = new THREE.MeshStandardMaterial({
        color: 0x555555, roughness: 0.6, metalness: 0.7,
        transparent: true, opacity: 0.6, side: THREE.DoubleSide
    });
    const padMat = new THREE.MeshStandardMaterial({
        color: 0xcccc00, emissive: 0x333300, emissiveIntensity: 0.2,
        transparent: true, opacity: 0.5
    });

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

    // ══════════════════════════════════════════════
    //  STAIRWELL EXIT → ROOFTOP (transition)
    //  x[35..39] z[-24..-20]
    // ══════════════════════════════════════════════
    // Floor connecting stairwell to roof
    addBox(4, 0.3, 4, roofMat, 37, Y - 0.15, -22);
    // Stairwell housing on roof
    addBox(4.5, 2.5, 0.4, concreteMat, 37, Y + 1.25, -24, true);  // back wall
    addBox(0.4, 2.5, 4, concreteMat, 35, Y + 1.25, -22, true);   // left wall
    addBox(0.4, 2.5, 4, concreteMat, 39, Y + 1.25, -22, true);   // right wall

    // Door frame
    addBox(3.5, 0.15, 0.1, metalMat, 37, Y + 2.4, -20.2);

    // Exit light
    const exitLight = new THREE.PointLight(0xff2200, 0.8, 10);
    exitLight.position.set(37, Y + 2, -22);
    scene.add(exitLight);

    // ══════════════════════════════════════════════
    //  MAIN ROOFTOP  x[20..50] z[-20..0]
    //  Flat concrete, chain-link fence edges, helicopter pad
    // ══════════════════════════════════════════════
    // Roof floor
    addBox(30, 0.4, 20, roofMat, 35, Y - 0.2, -10);

    // ── PARAPET / CHAIN-LINK FENCE (edges) ──
    // Concrete lip around edges
    addBox(30, 1.2, 0.5, concreteMat, 35, Y + 0.6, 0, true);     // north edge
    addBox(30, 1.2, 0.5, concreteMat, 35, Y + 0.6, -20, true);   // south edge
    addBox(0.5, 1.2, 20, concreteMat, 20, Y + 0.6, -10, true);   // west edge
    addBox(0.5, 1.2, 20, concreteMat, 50, Y + 0.6, -10, true);   // east edge

    // Chain-link fence above parapet
    addBox(30, 1.5, 0.05, fenceMat, 35, Y + 1.95, 0);
    addBox(30, 1.5, 0.05, fenceMat, 35, Y + 1.95, -20);
    addBox(0.05, 1.5, 20, fenceMat, 20, Y + 1.95, -10);
    addBox(0.05, 1.5, 20, fenceMat, 50, Y + 1.95, -10);

    // Fence posts
    for (let x = 22; x <= 48; x += 4) {
        addBox(0.06, 2.5, 0.06, metalMat, x, Y + 1.25, 0);
        addBox(0.06, 2.5, 0.06, metalMat, x, Y + 1.25, -20);
    }
    for (let z = -18; z <= -2; z += 4) {
        addBox(0.06, 2.5, 0.06, metalMat, 20, Y + 1.25, z);
        addBox(0.06, 2.5, 0.06, metalMat, 50, Y + 1.25, z);
    }

    // ── HELICOPTER PAD ──
    // "H" marking on the roof
    const hPadRing = new THREE.Mesh(
        new THREE.RingGeometry(4, 4.3, 32),
        padMat
    );
    hPadRing.position.set(35, Y + 0.01, -10);
    hPadRing.rotation.x = -Math.PI / 2;
    scene.add(hPadRing);

    // H letter (two vertical bars + crossbar)
    addBox(0.4, 0.02, 3, padMat, 34, Y + 0.02, -10);  // left vertical
    addBox(0.4, 0.02, 3, padMat, 36, Y + 0.02, -10);  // right vertical
    addBox(2.4, 0.02, 0.4, padMat, 35, Y + 0.02, -10); // crossbar

    // ── ROOFTOP PROPS ──
    // HVAC units
    addBox(2, 1.5, 1.5, metalMat, 24, Y + 0.75, -5, true);
    addBox(1.5, 1, 1.5, metalMat, 24, Y + 0.5, -15, true);
    addBox(2.5, 1.8, 2, metalMat, 46, Y + 0.9, -8, true);

    // Antenna tower
    const antMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 });
    addBox(0.1, 5, 0.1, antMat, 45, Y + 2.5, -16);
    // Blinking red light on antenna
    const antLight = new THREE.PointLight(0xff0000, 0.5, 8);
    antLight.position.set(45, Y + 5, -16);
    scene.add(antLight);

    // ── AMBIENT LIGHTING (minimal — storm exposure) ──
    const roofAmbient = new THREE.PointLight(0x445566, 0.3, 30);
    roofAmbient.position.set(35, Y + 6, -10);
    scene.add(roofAmbient);

    // ── CHAPTER END TRIGGER ZONE ──
    // When the player walks to the north edge overlooking the void, cinematic triggers
    const triggerZone = new THREE.Mesh(
        new THREE.BoxGeometry(20, 3, 3),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    triggerZone.position.set(35, Y + 1.5, -2);
    triggerZone.userData = {
        type: 'chapter_end_trigger',
        triggered: false,
    };
    scene.add(triggerZone);

    return {
        colliders,
        interactableObjects,
        triggerZone,
        antLight,
    };
}
