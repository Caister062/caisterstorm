import * as THREE from 'three';

/**
 * Procedural texture generator for UE-style PBR materials
 */
export class TextureFactory {

    static createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    /**
     * Concrete / Stucco wall texture
     */
    static concreteTexture(width = 512, height = 512, baseColor = [42, 42, 48]) {
        const canvas = this.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Base color
        ctx.fillStyle = `rgb(${baseColor[0]},${baseColor[1]},${baseColor[2]})`;
        ctx.fillRect(0, 0, width, height);

        // Add noise grain for concrete feel
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 30;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);

        // Add subtle cracks
        ctx.strokeStyle = `rgba(${baseColor[0] - 15},${baseColor[1] - 15},${baseColor[2] - 10}, 0.4)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            let x = Math.random() * width;
            let y = Math.random() * height;
            ctx.moveTo(x, y);
            for (let j = 0; j < 5; j++) {
                x += (Math.random() - 0.5) * 80;
                y += (Math.random() - 0.5) * 80;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Stains / water damage
        for (let i = 0; i < 5; i++) {
            const sx = Math.random() * width;
            const sy = Math.random() * height;
            const sr = 20 + Math.random() * 60;
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            grad.addColorStop(0, `rgba(${baseColor[0] - 10},${baseColor[1] - 8},${baseColor[2] - 5}, 0.3)`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        return tex;
    }

    /**
     * Normal map for concrete (gives depth illusion)
     */
    static concreteNormal(width = 512, height = 512) {
        const canvas = this.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Neutral normal (pointing straight up = 128,128,255)
        ctx.fillStyle = 'rgb(128,128,255)';
        ctx.fillRect(0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const nx = (Math.random() - 0.5) * 20;
            const ny = (Math.random() - 0.5) * 20;
            data[i] = Math.max(0, Math.min(255, 128 + nx));
            data[i + 1] = Math.max(0, Math.min(255, 128 + ny));
            // Z stays high (mostly pointing out)
            data[i + 2] = 230 + Math.random() * 25;
        }
        ctx.putImageData(imageData, 0, 0);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        return tex;
    }

    /**
     * Metal / brushed steel texture
     */
    static metalTexture(width = 256, height = 256, baseColor = [80, 85, 95]) {
        const canvas = this.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Base
        ctx.fillStyle = `rgb(${baseColor[0]},${baseColor[1]},${baseColor[2]})`;
        ctx.fillRect(0, 0, width, height);

        // Brushed streaks (horizontal)
        for (let y = 0; y < height; y++) {
            const brightness = (Math.random() - 0.5) * 15;
            ctx.fillStyle = `rgba(${128 + brightness},${128 + brightness},${135 + brightness},0.1)`;
            ctx.fillRect(0, y, width, 1);
        }

        // Scuffs
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 12;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    /**
     * Floor tile texture (industrial)
     */
    static floorTexture(width = 512, height = 512) {
        const canvas = this.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Dark base
        ctx.fillStyle = '#1a1a22';
        ctx.fillRect(0, 0, width, height);

        // Tile grid
        const tileSize = width / 4;
        ctx.strokeStyle = 'rgba(40,40,50,0.6)';
        ctx.lineWidth = 2;
        for (let x = 0; x <= width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Noise per tile
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 15;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);

        // Scuff marks
        ctx.strokeStyle = 'rgba(10,10,10,0.2)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            const x1 = Math.random() * width;
            const y1 = Math.random() * height;
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(
                x1 + (Math.random() - 0.5) * 100,
                y1 + (Math.random() - 0.5) * 100,
                x1 + (Math.random() - 0.5) * 150,
                y1 + (Math.random() - 0.5) * 150
            );
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(3, 3);
        return tex;
    }

    /**
     * Ceiling panel texture
     */
    static ceilingTexture(width = 512, height = 512) {
        const canvas = this.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#151518';
        ctx.fillRect(0, 0, width, height);

        // Ceiling tile grid
        const tileW = width / 3;
        const tileH = height / 3;
        ctx.strokeStyle = 'rgba(30,30,35,0.8)';
        ctx.lineWidth = 3;
        for (let x = 0; x <= width; x += tileW) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y <= height; y += tileH) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }

        // Perforated dots pattern
        ctx.fillStyle = 'rgba(8,8,10,0.4)';
        for (let x = 8; x < width; x += 12) {
            for (let y = 8; y < height; y += 12) {
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Water stain
        const grad = ctx.createRadialGradient(width * 0.6, height * 0.4, 0, width * 0.6, height * 0.4, 80);
        grad.addColorStop(0, 'rgba(20,18,12,0.3)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        return tex;
    }

    /**
     * Exterior concrete (lighter, weathered)
     */
    static exteriorConcreteTexture(width = 512, height = 512) {
        return this.concreteTexture(width, height, [95, 95, 100]);
    }

    /**
     * Snow/ground texture
     */
    static snowTexture(width = 512, height = 512) {
        const canvas = this.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#c8d4e0';
        ctx.fillRect(0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 20;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise + 5));
        }
        ctx.putImageData(imageData, 0, 0);

        // Wind drift lines
        ctx.strokeStyle = 'rgba(180,190,210,0.2)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            const y = Math.random() * height;
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(width * 0.3, y + (Math.random() - 0.5) * 30,
                width * 0.7, y + (Math.random() - 0.5) * 30, width, y + (Math.random() - 0.5) * 20);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return tex;
    }

    /**
     * Create a complete PBR material set
     */
    static createConcreteMaterial(options = {}) {
        const { color = [42, 42, 48], roughness = 0.85, metalness = 0.05 } = options;
        return new THREE.MeshStandardMaterial({
            map: this.concreteTexture(512, 512, color),
            normalMap: this.concreteNormal(),
            normalScale: new THREE.Vector2(0.5, 0.5),
            roughness,
            metalness,
            side: THREE.DoubleSide,
        });
    }

    static createMetalMaterial(options = {}) {
        const { color = [80, 85, 95], roughness = 0.25, metalness = 0.85 } = options;
        return new THREE.MeshStandardMaterial({
            map: this.metalTexture(256, 256, color),
            roughness,
            metalness,
        });
    }

    static createFloorMaterial() {
        return new THREE.MeshStandardMaterial({
            map: this.floorTexture(),
            normalMap: this.concreteNormal(),
            normalScale: new THREE.Vector2(0.3, 0.3),
            roughness: 0.9,
            metalness: 0.05,
        });
    }

    static createCeilingMaterial() {
        return new THREE.MeshStandardMaterial({
            map: this.ceilingTexture(),
            roughness: 0.95,
            metalness: 0.0,
        });
    }

    static createExteriorMaterial() {
        return new THREE.MeshStandardMaterial({
            map: this.exteriorConcreteTexture(),
            normalMap: this.concreteNormal(),
            normalScale: new THREE.Vector2(0.6, 0.6),
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide,
        });
    }

    static createSnowMaterial() {
        return new THREE.MeshStandardMaterial({
            map: this.snowTexture(),
            roughness: 0.95,
            metalness: 0.0,
        });
    }
}
