import * as THREE from 'three';

export class HorrorEvents {
    constructor(scene, camera, audioManager, state) {
        this.scene = scene;
        this.camera = camera;
        this.audio = audioManager;
        this.state = state;
        this.triggered = new Set();
        this.flickerOverride = 0;
        this.scareTimer = 0;
        this.nextScareTime = 15 + Math.random() * 20;
        this.whisperZone = new THREE.Vector3(9, 1.7, -5); // server room center

        this.events = [
            { id: 'lobby_enter', zone: new THREE.Vector3(0, 1.7, 8), radius: 4, type: 'lights_out' },
            { id: 'hall_midpoint', zone: new THREE.Vector3(0, 1.7, -3), radius: 3, type: 'shadow_figure' },
            { id: 'office_enter', zone: new THREE.Vector3(-6, 1.7, -3), radius: 3, type: 'door_slam' },
            { id: 'server_approach', zone: new THREE.Vector3(5, 1.7, -5), radius: 3, type: 'whisper' },
            { id: 'server_deep', zone: new THREE.Vector3(9, 1.7, -9), radius: 3, type: 'heartbeat' },
            { id: 'break_room', zone: new THREE.Vector3(-12, 1.7, -19), radius: 4, type: 'tv_scare' },
            { id: 'basement_enter', zone: new THREE.Vector3(12, 1.7, -16), radius: 3, type: 'lights_out' },
            { id: 'basement_deep', zone: new THREE.Vector3(12, 1.7, -24), radius: 3, type: 'final_scare' },
        ];

        // Shadow figure mesh (hidden until triggered)
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.85 });
        this.shadowFigure = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.3, 1.4, 4, 8),
            shadowMat
        );
        this.shadowFigure.visible = false;
        scene.add(this.shadowFigure);
    }

    update(delta, elapsed, playerPos) {
        // Check zone triggers
        for (const event of this.events) {
            if (this.triggered.has(event.id)) continue;
            if (playerPos.distanceTo(event.zone) < event.radius) {
                this.triggered.add(event.id);
                this._triggerEvent(event);
            }
        }

        // Random ambient scares
        this.scareTimer += delta;
        if (this.scareTimer > this.nextScareTime) {
            this.scareTimer = 0;
            this.nextScareTime = 20 + Math.random() * 30;
            this._randomScare(playerPos);
        }

        // Whisper intensity near server room
        const serverDist = playerPos.distanceTo(this.whisperZone);
        if (serverDist < 8 && Math.random() < 0.002) {
            this.audio.playWhisper();
        }

        // Flickering override countdown
        if (this.flickerOverride > 0) {
            this.flickerOverride -= delta;
        }

        // Shadow figure animation
        if (this.shadowFigure.visible) {
            this.shadowFigure.material.opacity -= delta * 0.5;
            if (this.shadowFigure.material.opacity <= 0) {
                this.shadowFigure.visible = false;
            }
        }
    }

    _triggerEvent(event) {
        switch (event.type) {
            case 'lights_out':
                this._lightsOut();
                break;
            case 'shadow_figure':
                this._showShadowFigure();
                break;
            case 'door_slam':
                this._doorSlam();
                break;
            case 'whisper':
                this.audio.playWhisper();
                break;
            case 'heartbeat':
                this.audio.playHeartbeat();
                break;
            case 'tv_scare':
                this._tvScare();
                break;
            case 'final_scare':
                this._finalScare();
                break;
        }
    }

    _lightsOut() {
        this.flickerOverride = 3;
        this.audio.playScare();
        this._screenFlash('damage-flash');
        // Lights recover after 3 seconds (handled by flickerOverride)
    }

    _showShadowFigure() {
        // Place shadow at end of hallway
        this.shadowFigure.position.set(0, 1.2, -12);
        this.shadowFigure.visible = true;
        this.shadowFigure.material.opacity = 0.85;
        this.audio.playScare();
    }

    _doorSlam() {
        this.audio.playDoorSlam();
        this._screenFlash('screen-flash');
    }

    _tvScare() {
        // Burst of static and flash
        this.audio.playStatic();
        this.audio.playScare();
        this._screenFlash('damage-flash');
    }

    _finalScare() {
        // Multiple rapid effects
        this.audio.playScare();
        this.audio.playHeartbeat();
        this._screenFlash('damage-flash');
        // Show shadow figure right behind
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        this.shadowFigure.position.copy(this.camera.position);
        this.shadowFigure.position.add(dir.multiplyScalar(-3));
        this.shadowFigure.position.y = 1.2;
        this.shadowFigure.visible = true;
        this.shadowFigure.material.opacity = 1;
    }

    _randomScare(playerPos) {
        const roll = Math.random();
        if (roll < 0.3) {
            this.audio.playWhisper();
        } else if (roll < 0.5) {
            this.audio.playDoorSlam();
        } else if (roll < 0.7) {
            // Distant footsteps
            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    this.audio._playTone(50 + Math.random() * 30, 0.06, 0.04);
                }, i * 400);
            }
        } else {
            this.audio.playHeartbeat();
        }
    }

    _screenFlash(className) {
        const flash = document.createElement('div');
        flash.className = className;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);
    }
}
