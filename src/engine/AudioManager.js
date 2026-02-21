import * as THREE from 'three';

export class AudioManager {
    constructor(camera, state) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        this.state = state;
        this.ctx = this.listener.context;
        this.sounds = {};
        this.ambiencePlaying = false;
        this.footstepTimer = 0;
        this.footstepInterval = 0.5;
        this._createSounds();
    }

    _createSounds() {
        // We generate audio procedurally using Web Audio API
        this.sounds.wind = this._createWindLoop();
        this.sounds.hum = this._createHumLoop();
        this.sounds.heartbeat = this._createHeartbeat();
    }

    _createWindLoop() {
        const ctx = this.ctx;
        const bufferSize = ctx.sampleRate * 4;
        const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                lastOut = 0.99 * lastOut + 0.01 * white;
                // Wind modulation
                const mod = Math.sin(i / ctx.sampleRate * 0.3) * 0.5 + 0.5;
                data[i] = lastOut * 0.3 * mod;
            }
        }
        return buffer;
    }

    _createHumLoop() {
        const ctx = this.ctx;
        const duration = 3;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / ctx.sampleRate;
            data[i] = (Math.sin(t * 60 * Math.PI * 2) * 0.05 +
                Math.sin(t * 120 * Math.PI * 2) * 0.02 +
                Math.sin(t * 180 * Math.PI * 2) * 0.01) *
                (0.5 + Math.sin(t * 0.5) * 0.5);
        }
        return buffer;
    }

    _createHeartbeat() {
        const ctx = this.ctx;
        const duration = 1.5;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / ctx.sampleRate;
            const beat1 = t < 0.1 ? Math.sin(t * 40 * Math.PI * 2) * Math.exp(-t * 30) * 0.4 : 0;
            const beat2 = (t > 0.2 && t < 0.3) ? Math.sin((t - 0.2) * 50 * Math.PI * 2) * Math.exp(-(t - 0.2) * 25) * 0.3 : 0;
            data[i] = beat1 + beat2;
        }
        return buffer;
    }

    startAmbience() {
        if (this.ambiencePlaying) return;
        this.ambiencePlaying = true;

        // Resume audio context
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Wind
        this.windSource = this.ctx.createBufferSource();
        this.windSource.buffer = this.sounds.wind;
        this.windSource.loop = true;
        const windGain = this.ctx.createGain();
        windGain.gain.value = 0.15;
        this.windSource.connect(windGain).connect(this.ctx.destination);
        this.windSource.start();

        // Hum
        this.humSource = this.ctx.createBufferSource();
        this.humSource.buffer = this.sounds.hum;
        this.humSource.loop = true;
        const humGain = this.ctx.createGain();
        humGain.gain.value = 0.08;
        this.humSource.connect(humGain).connect(this.ctx.destination);
        this.humSource.start();
    }

    stopAll() {
        this.ambiencePlaying = false;
        try { this.windSource?.stop(); } catch (e) { }
        try { this.humSource?.stop(); } catch (e) { }
    }

    playClick() {
        this._playTone(800, 0.05, 0.15);
    }

    playTerminal() {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }

    playStatic() {
        const ctx = this.ctx;
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
    }

    playScare() {
        const ctx = this.ctx;
        // Dissonant stinger
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.value = 180;
        osc2.frequency.value = 187; // slight detune for horror
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(); osc2.start();
        osc1.stop(ctx.currentTime + 1.5);
        osc2.stop(ctx.currentTime + 1.5);
    }

    playWhisper() {
        const ctx = this.ctx;
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const t = i / ctx.sampleRate;
            const white = Math.random() * 2 - 1;
            lastOut = 0.95 * lastOut + 0.05 * white;
            const mod = Math.sin(t * 3) * Math.sin(t * 7) * 0.5 + 0.5;
            data[i] = lastOut * 0.06 * mod * Math.sin(t * Math.PI / 2);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
    }

    playDoorSlam() {
        this._playTone(60, 0.2, 0.3);
    }

    playBassBoom() {
        const ctx = this.ctx;
        // Deep sub-bass impact — chest-shaking boom
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.value = 25; // Sub-bass

        osc2.type = 'sine';
        osc2.frequency.value = 50; // Overtone

        osc3.type = 'sine';
        osc3.frequency.value = 75; // Higher overtone

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);

        osc1.connect(gain);
        osc2.connect(gain);
        osc3.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(); osc2.start(); osc3.start();
        osc1.stop(ctx.currentTime + 3);
        osc2.stop(ctx.currentTime + 3);
        osc3.stop(ctx.currentTime + 3);

        // Noise burst for impact
        const noiseLen = ctx.sampleRate * 0.3;
        const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05)) * 0.3;
        }
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.4;
        noiseSrc.connect(noiseGain).connect(ctx.destination);
        noiseSrc.start();
    }

    playAlarm() {
        const ctx = this.ctx;
        // Emergency klaxon — pulsing two-tone siren
        for (let i = 0; i < 6; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            const t = ctx.currentTime + i * 1;
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.setValueAtTime(880, t + 0.5);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.setValueAtTime(0.08, t + 0.5);
            gain.gain.setValueAtTime(0.001, t + 0.95);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 1);
        }
    }

    playHeartbeat() {
        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds.heartbeat;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.25;
        source.connect(gain).connect(this.ctx.destination);
        source.start();
    }

    _playTone(freq, dur, vol) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
    }

    updateFootsteps(delta, sprinting) {
        this.footstepTimer += delta;
        const interval = sprinting ? 0.3 : 0.5;
        if (this.footstepTimer >= interval) {
            this.footstepTimer = 0;
            this._playTone(80 + Math.random() * 40, 0.08, 0.06);
        }
    }

    update(delta, playerPos) {
        // Could add positional audio updates here
    }
}
