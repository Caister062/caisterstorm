import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildLegacyHQ } from './world/LegacyHQ.js';
import { buildCoolingTunnels } from './world/CoolingTunnels.js';
import { buildSecretLab } from './world/SecretLab.js';
import { buildRooftop } from './world/Rooftop.js';
import { createBlizzard } from './world/Blizzard.js';
import { setupLighting } from './world/Lighting.js';
import { HorrorEvents } from './horror/HorrorEvents.js';
import { createEntity } from './horror/Entity.js';
import { AudioManager } from './engine/AudioManager.js';
import { StoryManager } from './narrative/StoryManager.js';

// ── Game State ──
const state = {
    playing: false,
    paused: false,
    noteOpen: false,
    flashlightOn: true,
    battery: 100,
    sensitivity: 5,
    volume: 70,
    quality: 'high',
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    sprinting: false,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    clock: new THREE.Clock(),
    playerHeight: 1.7,
    walkSpeed: 1.8,   // Slow horror-game pace
    sprintSpeed: 3.2,  // Slightly faster but still tense
    collectiblesFound: 0,
    chapter: 1,
};

// ── DOM References ──
const dom = {
    loadingScreen: document.getElementById('loading-screen'),
    loadingBar: document.getElementById('loading-bar'),
    loadingText: document.getElementById('loading-text'),
    titleScreen: document.getElementById('title-screen'),
    settingsOverlay: document.getElementById('settings-overlay'),
    gameHud: document.getElementById('game-hud'),
    noteViewer: document.getElementById('note-viewer'),
    noteContent: document.getElementById('note-content'),
    btnCloseNote: document.getElementById('btn-close-note'),
    pauseMenu: document.getElementById('pause-menu'),
    container: document.getElementById('game-container'),
    crosshair: document.getElementById('crosshair'),
    batteryBar: document.getElementById('battery-bar'),
    interactionPrompt: document.getElementById('interaction-prompt'),
    promptText: document.getElementById('prompt-text'),
    hintText: document.getElementById('hint-text'),
};

// ── Three.js Core ──
let renderer, scene, camera, composer, controls;
let flashlight, flashlightTarget;
let blizzardSystem, horrorEvents, entitySystem, audioManager, storyManager;
let interactables = [];
const raycaster = new THREE.Raycaster();
raycaster.far = 5;

// ── Vignette Shader ──
const VignetteShader = {
    uniforms: {
        tDiffuse: { value: null },
        darkness: { value: 1.2 },
        offset: { value: 1.0 },
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;
    void main(){
      vec4 color=texture2D(tDiffuse,vUv);
      float dist=distance(vUv,vec2(0.5));
      color.rgb*=smoothstep(0.8,offset*0.5,dist*(darkness+offset));
      gl_FragColor=color;
    }`,
};

// ── Film Grain Shader ──
const FilmGrainShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        intensity: { value: 0.08 },
    },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;
    float rand(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      vec4 color=texture2D(tDiffuse,vUv);
      float grain=rand(vUv+time)*intensity;
      color.rgb+=grain-intensity*0.5;
      gl_FragColor=color;
    }`,
};

// ── Initialize ──
async function init() {
    updateLoading(10, 'Creating renderer...');

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    dom.container.appendChild(renderer.domElement);

    updateLoading(20, 'Building scene...');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);
    scene.fog = new THREE.FogExp2(0x0a0e14, 0.008);

    // Camera — start inside the lobby, facing the inner door
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, state.playerHeight, 5.5);
    camera.lookAt(0, state.playerHeight, 4); // Face the inner hallway door — right in front of you

    // Controls
    controls = new PointerLockControls(camera, document.body);

    updateLoading(35, 'Constructing Legacy HQ...');

    // Build world
    const { colliders, interactableObjects, hatchTrigger, coreLight } = buildLegacyHQ(scene);
    interactables = interactableObjects;
    state.hatchTrigger = hatchTrigger;
    state.coreLight = coreLight;
    // Populate collision boxes
    for (const box of colliders) {
        wallBoxes.push(box);
    }

    // Build underground cooling tunnels
    const tunnelData = buildCoolingTunnels(scene);
    for (const box of tunnelData.colliders) wallBoxes.push(box);
    interactables.push(...tunnelData.interactableObjects);
    state.tunnelData = tunnelData;
    state.valvesTurned = 0;

    // Build secret lab
    const labData = buildSecretLab(scene);
    for (const box of labData.colliders) wallBoxes.push(box);
    interactables.push(...labData.interactableObjects);
    state.labData = labData;

    // Build rooftop
    const rooftopData = buildRooftop(scene);
    for (const box of rooftopData.colliders) wallBoxes.push(box);
    interactables.push(...rooftopData.interactableObjects);
    state.rooftopData = rooftopData;

    updateLoading(55, 'Summoning the blizzard...');

    // Blizzard
    blizzardSystem = createBlizzard(scene);

    // Lighting
    const { flashlightObj, flashlightTargetObj } = setupLighting(scene, camera);
    flashlight = flashlightObj;
    flashlightTarget = flashlightTargetObj;

    updateLoading(70, 'Initializing horror systems...');

    // Audio
    audioManager = new AudioManager(camera, state);

    // Story
    storyManager = new StoryManager(interactables);

    // Horror (chapter 2 only — chapter 1 is exploration)
    horrorEvents = new HorrorEvents(scene, camera, audioManager, state);
    // Entity is NOT created in Chapter 1
    entitySystem = null;

    updateLoading(85, 'Post-processing...');

    // Post-processing
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.6, 0.85
    );
    composer.addPass(bloomPass);
    composer.addPass(new ShaderPass(VignetteShader));
    const grainPass = new ShaderPass(FilmGrainShader);
    composer.addPass(grainPass);

    updateLoading(100, 'Ready.');

    // Hide loading after brief delay
    await delay(600);
    dom.loadingScreen.classList.add('hidden');
    dom.titleScreen.classList.remove('hidden');

    // Bind events
    bindEvents();

    // Start loop
    animate();
}

function updateLoading(pct, text) {
    dom.loadingBar.style.width = pct + '%';
    dom.loadingText.textContent = text;
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ── Event Binding ──
function bindEvents() {
    // Title buttons
    document.getElementById('btn-play').addEventListener('click', startGame);
    dom.btnCloseNote.addEventListener('click', closeNote);
    document.getElementById('btn-settings').addEventListener('click', () => {
        dom.settingsOverlay.classList.remove('hidden');
    });
    document.getElementById('btn-back-settings').addEventListener('click', () => {
        dom.settingsOverlay.classList.add('hidden');
        state.sensitivity = parseInt(document.getElementById('sensitivity').value);
        state.volume = parseInt(document.getElementById('volume').value);
        state.quality = document.getElementById('quality').value;
    });

    // Pause
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-quit').addEventListener('click', quitToMenu);

    // Pointer lock
    controls.addEventListener('lock', () => {
        if (state.playing && !state.noteOpen) {
            dom.pauseMenu.classList.add('hidden');
            state.paused = false;
        }
    });
    controls.addEventListener('unlock', () => {
        if (state.playing && !state.noteOpen) {
            state.paused = true;
            dom.pauseMenu.classList.remove('hidden');
        }
    });

    // Keyboard
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Resize
    window.addEventListener('resize', onResize);
}

function startGame() {
    dom.titleScreen.classList.add('hidden');
    dom.gameHud.classList.remove('hidden');
    state.playing = true;
    state.paused = false;
    controls.lock();
    audioManager.startAmbience();
    showHint('Legacy HQ — Ottawa, Canada\nFebruary 2026');
}

function resumeGame() {
    dom.pauseMenu.classList.add('hidden');
    state.paused = false;
    controls.lock();
}

function quitToMenu() {
    state.playing = false;
    state.paused = false;
    dom.pauseMenu.classList.add('hidden');
    dom.gameHud.classList.add('hidden');
    dom.titleScreen.classList.remove('hidden');
    controls.unlock();
    audioManager.stopAll();
}

function showHint(text) {
    dom.hintText.textContent = text;
    dom.hintText.classList.remove('hidden');
    dom.hintText.style.animation = 'none';
    dom.hintText.offsetHeight; // reflow
    dom.hintText.style.animation = 'hint-fade 5s ease-in-out forwards';
    setTimeout(() => dom.hintText.classList.add('hidden'), 5000);
}

function onKeyDown(e) {
    if (!state.playing) return;

    switch (e.code) {
        case 'KeyW': case 'ArrowUp': state.moveForward = true; break;
        case 'KeyS': case 'ArrowDown': state.moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft': state.moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': state.moveRight = true; break;
        case 'ShiftLeft': state.sprinting = true; break;
        case 'KeyF': toggleFlashlight(); break;
        case 'KeyE': tryInteract(); break;
    }
}

function onKeyUp(e) {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': state.moveForward = false; break;
        case 'KeyS': case 'ArrowDown': state.moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft': state.moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': state.moveRight = false; break;
        case 'ShiftLeft': state.sprinting = false; break;
    }
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// ── Flashlight ──
function toggleFlashlight() {
    if (state.battery <= 0) return;
    state.flashlightOn = !state.flashlightOn;
    flashlight.visible = state.flashlightOn;
    audioManager.playClick();
}

// ── Interaction ──
function tryInteract() {
    if (state.paused || state.noteOpen) return;
    raycaster.setFromCamera(_center, camera);
    raycaster.far = 5;
    const hits = raycaster.intersectObjects(interactables, true);
    if (hits.length > 0) {
        const obj = hits[0].object.userData.type ? hits[0].object : hits[0].object.parent;
        if (!obj.userData || obj.userData.interactable === false) return;
        if (obj.userData && obj.userData.type === 'note') {
            openNote(obj.userData.content);
        } else if (obj.userData && obj.userData.type === 'terminal') {
            openNote(obj.userData.content);
            audioManager.playTerminal();
        } else if (obj.userData && obj.userData.type === 'vhs') {
            openNote(obj.userData.content);
            audioManager.playStatic();
        } else if (obj.userData && obj.userData.type === 'door') {
            openDoor(obj.userData);
        } else if (obj.userData && obj.userData.type === 'final_terminal') {
            openNote(obj.userData.content);
            audioManager.playTerminal();
            state.finalTerminalRead = true;
            // Trigger lockdown cinematic after closing the note
            state.pendingCinematic = true;
        } else if (obj.userData && obj.userData.type === 'keycard') {
            // Pick up keycard — hide instead of scene.remove to avoid lag
            state.hasKeycard = true;
            obj.visible = false;
            obj.userData.interactable = false;
            if (obj.userData.glowLight) obj.userData.glowLight.visible = false;
            audioManager.playClick();
            showHint('Level 5 Access Card acquired');
        } else if (obj.userData && obj.userData.type === 'valve') {
            if (!obj.userData.turned) {
                obj.userData.turned = true;
                // Spin valve wheel
                obj.userData.wheel.rotation.z += Math.PI * 2;
                // Indicator turns green
                obj.userData.indicMat.color.setHex(0x00ff00);
                obj.userData.indicMat.emissive.setHex(0x00ff00);
                audioManager._playTone(300 + state.valvesTurned * 100, 0.3, 0.15);
                state.valvesTurned++;
                showHint(`Valve ${state.valvesTurned}/3 activated`);
                // All 3 valves = puzzle solved
                if (state.valvesTurned >= 3) {
                    setTimeout(() => {
                        showHint('POWER RESTORED — Exit unsealed');
                        audioManager.playTerminal();
                        const td = state.tunnelData;
                        // Open exit door
                        td.exitIndicMat.color.setHex(0x00ff00);
                        td.exitIndicMat.emissive.setHex(0x00ff00);
                        td.exitLight.intensity = 1.5;
                        td.exitLight.distance = 6;
                        // Slide door open
                        const startZ = td.exitDoor.position.z;
                        const dur = 2000;
                        const st = performance.now();
                        function animExit() {
                            const t = Math.min((performance.now() - st) / dur, 1);
                            td.exitDoor.position.z = startZ + 2 * (1 - Math.pow(1 - t, 3));
                            if (t < 1) requestAnimationFrame(animExit);
                            else wallBoxes[td.exitDoorColliderIdx].makeEmpty();
                        }
                        animExit();
                    }, 1500);
                }
            }
        } else if (obj.userData && obj.userData.type === 'hatch') {
            // Only allow if hatch is activated (explicitly check the state flag)
            if (!state.finalTerminalRead || !obj.userData.interactable) {
                showHint('The hatch is sealed shut');
                return;
            }
            // Teleport player underground
            camera.position.set(-13, -4 + state.playerHeight, -26);
            showHint('You descend into the cooling tunnels...');
            audioManager.playDoorSlam();
        } else if (obj.userData && obj.userData.type === 'keycard_10') {
            // Pick up Level 10 keycard — hide instead of scene.remove
            state.hasKeycard10 = true;
            obj.visible = false;
            obj.userData.interactable = false;
            if (obj.userData.glowLight) obj.userData.glowLight.visible = false;
            audioManager.playClick();
            showHint('Level 10 Emergency Keycard acquired');
        } else if (obj.userData && obj.userData.type === 'escape_door') {
            if (obj.userData.opened) return;
            if (!state.hasKeycard10) {
                showHint('LOCKED — Level 10 clearance required');
                audioManager._playTone(150, 0.15, 0.1);
            } else {
                obj.userData.opened = true;
                obj.userData.indicMat.color.setHex(0x00ff00);
                obj.userData.indicMat.emissive.setHex(0x00ff00);
                audioManager.playTerminal();
                showHint('ACCESS GRANTED — Get to the roof!');
                setTimeout(() => {
                    audioManager.playDoorSlam();
                    wallBoxes[obj.userData.doorColliderIdx].makeEmpty();
                    scene.remove(obj.userData.door);
                    // Teleport player to rooftop
                    setTimeout(() => {
                        camera.position.set(37, 4 + state.playerHeight, -22);
                        showHint('You emerge onto the rooftop...');
                    }, 500);
                }, 1000);
            }
        } else if (obj.userData && obj.userData.type === 'locked_door') {
            if (obj.userData.opened) return;
            if (!state.hasKeycard) {
                showHint('LOCKED — You need a security access card');
                audioManager._playTone(150, 0.15, 0.1);
            } else {
                openSecurityDoor(obj.userData);
            }
        }
        state.collectiblesFound++;
    }
}

// ── Security Door Opening ──
function openSecurityDoor(doorData) {
    if (doorData.opened) return;
    doorData.opened = true;

    // Indicator turns green
    doorData.indicatorMat.color.setHex(0x00ff00);
    doorData.indicatorMat.emissive.setHex(0x00ff00);
    doorData.secLight.color.setHex(0x00ff44);

    audioManager.playTerminal(); // Beep
    showHint('ACCESS GRANTED');

    // Delay then open
    setTimeout(() => {
        audioManager.playDoorSlam();

        const left = doorData.doorLeft;
        const right = doorData.doorRight;
        const startLeft = left.position.x;
        const startRight = right.position.x;
        const slideDistance = 1.6;
        const duration = 3000; // Heavy, slow blast door
        const startTime = performance.now();

        function animSec() {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const e = 1 - Math.pow(1 - t, 3);

            left.position.x = startLeft - slideDistance * e;
            right.position.x = startRight + slideDistance * e;

            if (t < 1) {
                requestAnimationFrame(animSec);
            } else {
                wallBoxes[doorData.doorColliderLeft].makeEmpty();
                wallBoxes[doorData.doorColliderRight].makeEmpty();
                showHint('The darkness deepens ahead...');
            }
        }
        animSec();
    }, 1500);
}

function openNote(content) {
    state.noteOpen = true;
    dom.noteViewer.classList.remove('hidden');
    dom.noteContent.textContent = '';
    // Typewriter effect
    let i = 0;
    const type = () => {
        if (i < content.length) {
            dom.noteContent.textContent += content[i];
            i++;
            setTimeout(type, 25);
        }
    };
    type();
    controls.unlock();
}

function closeNote() {
    state.noteOpen = false;
    dom.noteViewer.classList.add('hidden');
    controls.lock();

    // If a cinematic is pending, trigger it
    if (state.pendingCinematic && state.chapter === 1) {
        state.pendingCinematic = false;
        triggerChapter2Cinematic();
    }
}

// ══════════════════════════════════════════════
//  CHAPTER 1 ENDING — SERVER BOOT / LOCKDOWN
// ══════════════════════════════════════════════
function triggerChapter2Cinematic() {
    state.paused = true;

    const gc = document.getElementById('game-container');

    // ── STEP 1 (0s): System unexpectedly boots up ──
    // Terminal beep → core light surges → server LEDs begin flickering
    audioManager.playTerminal();
    showHint('SYSTEM BOOT DETECTED...');

    // Core light surges bright
    if (state.coreLight) {
        state.coreLight.intensity = 8;
        state.coreLight.distance = 20;
        state.coreLight.color.setHex(0xaa00ff);
    }

    // All scene lights pulse brighter briefly
    const originalIntensities = [];
    scene.traverse(obj => {
        if (obj.isLight) {
            originalIntensities.push({ light: obj, intensity: obj.intensity });
            obj.intensity *= 2.5;
        }
    });

    // ── STEP 2 (2s): Lights flicker wildly + alarms ──
    setTimeout(() => {
        audioManager.playAlarm();
        showHint('⚠ WARNING: UNAUTHORIZED SYSTEM ACCESS ⚠');

        // Rapid flicker effect
        let flickerCount = 0;
        const flickerInterval = setInterval(() => {
            scene.traverse(obj => {
                if (obj.isLight) {
                    obj.intensity = Math.random() > 0.4 ? obj.intensity * 1.5 : 0.05;
                }
            });
            flickerCount++;
            if (flickerCount > 20) clearInterval(flickerInterval);
        }, 100);
    }, 2000);

    // ── STEP 3 (4.5s): Screen shake + bass boom ──
    setTimeout(() => {
        audioManager.playBassBoom();
        gc.classList.add('screen-shake');
        setTimeout(() => gc.classList.remove('screen-shake'), 800);
    }, 4500);

    // ── STEP 4 (5.5s): Emergency lockdown — blackout ──
    setTimeout(() => {
        showHint('EMERGENCY LOCKDOWN INITIATED');
        audioManager.playScare();

        const blackout = document.createElement('div');
        blackout.className = 'chapter-blackout';
        blackout.id = 'lockdown-blackout';
        document.body.appendChild(blackout);
        requestAnimationFrame(() => blackout.classList.add('active'));

        // All lights drop to near-zero
        scene.traverse(obj => {
            if (obj.isLight) obj.intensity = 0.02;
        });
    }, 5500);

    // ── STEP 5 (7.5s): Red emergency lighting returns ──
    setTimeout(() => {
        const blackout = document.getElementById('lockdown-blackout');
        if (blackout) blackout.classList.remove('active');

        // Restore lights as dim red emergency lighting
        originalIntensities.forEach(({ light, intensity }) => {
            light.intensity = intensity * 0.3;
            // Non-ambient lights go red
            if (!light.isAmbientLight && light.color) {
                light.color.setHex(0xff2200);
            }
        });

        // Core light pulses deep red
        if (state.coreLight) {
            state.coreLight.intensity = 2;
            state.coreLight.color.setHex(0xff0000);
        }

        // Symbol glows intensely
        scene.traverse(obj => {
            if (obj.isPointLight && obj.color.r > 0.4 && obj.color.g < 0.1) {
                obj.intensity = 4;
                obj.distance = 12;
            }
        });

        audioManager.playHeartbeat();
    }, 7500);

    // ── STEP 6 (12s): Maintenance hatch unlocks ──
    setTimeout(() => {
        // Activate hatch
        if (state.hatchTrigger) {
            const hd = state.hatchTrigger.userData;
            hd.interactable = true;
            // Green glow activates
            hd.hatchGlow.intensity = 1.5;
            hd.hatchGlow.distance = 6;
            // Hatch panel turns green
            hd.hatchPanel.material.emissive.setHex(0x00aa33);
            hd.hatchPanel.material.emissiveIntensity = 0.8;
        }

        audioManager.playClick();
        showHint('Maintenance hatch unlocked — find it!');
    }, 12000);

    // ── STEP 7 (14s): Remove title, unfreeze player ──
    setTimeout(() => {
        const blackout = document.getElementById('lockdown-blackout');
        if (blackout) blackout.remove();

        state.paused = false;
        showHint('Find a way out!');
    }, 14000);
}

// ── Door Opening ──
function openDoor(doorData) {
    if (doorData.opened) return;
    doorData.opened = true;
    audioManager.playDoorSlam();

    const left = doorData.doorLeft;
    const right = doorData.doorRight;
    const hL = doorData.handleL;
    const hR = doorData.handleR;

    const startLeft = left.position.x;
    const startRight = right.position.x;
    const startHL = hL.position.x;
    const startHR = hR.position.x;
    const slideDistance = 1.6;

    const duration = 2000; // Slow, heavy door
    const startTime = performance.now();

    function animDoor() {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const e = 1 - Math.pow(1 - t, 3);

        left.position.x = startLeft - slideDistance * e;
        right.position.x = startRight + slideDistance * e;
        hL.position.x = startHL - slideDistance * e;
        hR.position.x = startHR + slideDistance * e;

        if (t < 1) {
            requestAnimationFrame(animDoor);
        } else {
            // Remove door colliders so player can walk through
            if (doorData.doorColliderLeft !== undefined) {
                // Set collider to empty box far away (effectively removing it)
                wallBoxes[doorData.doorColliderLeft].makeEmpty();
                wallBoxes[doorData.doorColliderRight].makeEmpty();
            }
            showHint('The hallway stretches into darkness...');
        }
    }
    animDoor();
}

// ── Collision ──
const playerBox = new THREE.Box3();
const playerSize = new THREE.Vector3(0.5, 1.7, 0.5);
const wallBoxes = [];

function checkCollision(newPos) {
    playerBox.setFromCenterAndSize(newPos, playerSize);
    for (const box of wallBoxes) {
        if (playerBox.intersectsBox(box)) return true;
    }
    return false;
}

// ── Reusable objects (avoid per-frame allocations) ──
const _center = new THREE.Vector2(0, 0);
const _flashDir = new THREE.Vector3();
let _interactFrame = 0;

// ── Head Bob ──
let bobTime = 0;
function getHeadBob(delta, isMoving, isSprinting) {
    if (!isMoving) {
        bobTime = 0;
        return 0;
    }
    const speed = isSprinting ? 14 : 10;
    const amplitude = isSprinting ? 0.06 : 0.03;
    bobTime += delta * speed;
    return Math.sin(bobTime) * amplitude;
}

// ── Game Loop ──
function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(state.clock.getDelta(), 0.1);
    const elapsed = state.clock.getElapsedTime();

    if (state.playing && !state.paused && !state.noteOpen) {
        // Movement with collision detection
        const speed = state.sprinting ? state.sprintSpeed : state.walkSpeed;

        state.direction.z = Number(state.moveForward) - Number(state.moveBackward);
        state.direction.x = Number(state.moveRight) - Number(state.moveLeft);
        state.direction.normalize();

        if (state.direction.length() > 0) {
            // Get camera forward/right vectors (XZ plane only)
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            camDir.y = 0; camDir.normalize();
            const camRight = new THREE.Vector3();
            camRight.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

            // Calculate desired movement
            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(camDir, state.direction.z * speed * delta);
            moveVec.addScaledVector(camRight, state.direction.x * speed * delta);

            // Save position
            const oldX = camera.position.x;
            const oldZ = camera.position.z;

            // Try X movement
            camera.position.x += moveVec.x;
            if (checkCollision(camera.position)) {
                camera.position.x = oldX; // Blocked on X
            }

            // Try Z movement
            camera.position.z += moveVec.z;
            if (checkCollision(camera.position)) {
                camera.position.z = oldZ; // Blocked on Z
            }
        }

        // Determine player level
        const playerY = camera.position.y;
        let floorY = 0;
        if (playerY > 2) floorY = 4;         // Rooftop
        else if (playerY < 0) floorY = -4;   // Underground
        camera.position.y = floorY + state.playerHeight + getHeadBob(delta,
            state.moveForward || state.moveBackward || state.moveLeft || state.moveRight,
            state.sprinting);

        // Clamp to level bounds
        if (floorY === -4) {
            // Underground: tunnels + lab
            camera.position.x = THREE.MathUtils.clamp(camera.position.x, -15.5, 39.5);
            camera.position.z = THREE.MathUtils.clamp(camera.position.z, -42.5, -23.5);
        } else if (floorY === 4) {
            // Rooftop
            camera.position.x = THREE.MathUtils.clamp(camera.position.x, 20.5, 49.5);
            camera.position.z = THREE.MathUtils.clamp(camera.position.z, -20.5, -0.5);
        } else {
            // Ground floor
            camera.position.x = THREE.MathUtils.clamp(camera.position.x, -17.5, 17.5);
            camera.position.z = THREE.MathUtils.clamp(camera.position.z, -27.5, 13.5);
        }

        // Rooftop edge trigger — Chapter 1 ending
        if (floorY === 4 && state.rooftopData && !state.rooftopData.triggerZone.userData.triggered) {
            const tz = state.rooftopData.triggerZone;
            // Use pre-cached bounding box
            if (!tz.userData._cachedBox) {
                tz.userData._cachedBox = new THREE.Box3().setFromObject(tz);
            }
            if (tz.userData._cachedBox.containsPoint(camera.position)) {
                tz.userData.triggered = true;
                triggerChapter2Cinematic();
            }
        }

        // Flashlight follow
        if (flashlightTarget) {
            camera.getWorldDirection(_flashDir);
            flashlightTarget.position.copy(camera.position).add(_flashDir.multiplyScalar(10));
            flashlight.position.copy(camera.position);
        }

        // Battery drain
        if (state.flashlightOn && state.battery > 0) {
            state.battery -= delta * 1.2;
            if (state.battery <= 0) {
                state.battery = 0;
                state.flashlightOn = false;
                flashlight.visible = false;
            }
        }
        dom.batteryBar.style.width = state.battery + '%';
        const isLow = state.battery < 25;
        if (isLow !== dom.batteryBar.classList.contains('low')) {
            dom.batteryBar.classList.toggle('low', isLow);
        }

        // Interaction raycast for prompt (throttle to every 3rd frame)
        _interactFrame++;
        if (_interactFrame % 3 === 0) {
            raycaster.setFromCamera(_center, camera);
            raycaster.far = 5;
            const hits = raycaster.intersectObjects(interactables, true);
            let foundInteractable = false;
            if (hits.length > 0) {
                const obj = hits[0].object.userData.type ? hits[0].object : hits[0].object.parent;
                // Only show prompt for objects that are actually interactable
                if (obj.userData && obj.userData.type && obj.userData.interactable !== false) {
                    dom.interactionPrompt.classList.remove('hidden');
                    dom.crosshair.classList.add('active');
                    dom.promptText.textContent = obj.userData.promptText || 'Interact';
                    foundInteractable = true;
                }
            }
            if (!foundInteractable) {
                dom.interactionPrompt.classList.add('hidden');
                dom.crosshair.classList.remove('active');
            }
        }

        // Update systems
        if (blizzardSystem) {
            blizzardSystem.update(delta, elapsed);
            // Hide blizzard when underground or inside ground floor
            const showBlizzard = floorY >= 4;
            if (blizzardSystem.particles) blizzardSystem.particles.visible = showBlizzard;
            if (blizzardSystem.streaks) blizzardSystem.streaks.visible = showBlizzard;
            if (blizzardSystem.fogPlanes) {
                blizzardSystem.fogPlanes.forEach(fp => fp.visible = showBlizzard);
            }
        }
        // Horror events and entity only active in chapter 2+
        if (horrorEvents && state.chapter >= 2) horrorEvents.update(delta, elapsed, camera.position);
        if (entitySystem && state.chapter >= 2) entitySystem.update(delta, elapsed, camera.position);
        if (audioManager) audioManager.update(delta, camera.position);

        // Steam burst hazard cycling (only when underground)
        if (floorY === -4 && state.tunnelData && state.tunnelData.steamBursts) {
            for (let i = 0; i < state.tunnelData.steamBursts.length; i++) {
                const sb = state.tunnelData.steamBursts[i];
                sb.timer += delta;
                if (sb.timer > 3) {
                    sb.timer = 0;
                    sb.active = !sb.active;
                    sb.cloud.material.opacity = sb.active ? 0.35 : 0.05;
                    sb.light.intensity = sb.active ? 0.6 : 0.1;
                    if (sb.active) {
                        const dist = camera.position.distanceTo(sb.position);
                        if (dist < sb.radius) {
                            showHint('⚠ Steam burn! Move away!');
                        }
                    }
                }
            }
        }

        // Footstep sounds
        const isMoving = state.moveForward || state.moveBackward || state.moveLeft || state.moveRight;
        if (isMoving) audioManager.updateFootsteps(delta, state.sprinting);

        // Film grain time
        if (composer.passes.length > 3) {
            composer.passes[3].uniforms.time.value = elapsed;
        }
    }

    composer.render();
}

// ── Start ──
init().catch(err => {
    console.error('Failed to initialize:', err);
    dom.loadingText.textContent = 'ERROR: ' + err.message;
});