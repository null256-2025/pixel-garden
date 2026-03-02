import * as THREE from 'three';

interface CrowdData {
    pathIndex: number;
    t: number;      // 0.0 to 1.0 position on curve
    speed: number;  // Path traversal speed
    offset: number; // Lateral offset (sidewalk)
    color: THREE.Color;
}

export class CrowdManager {
    private instancedMesh: THREE.InstancedMesh;
    private maxPeople: number;
    private paths: THREE.CatmullRomCurve3[] = [];
    private people: CrowdData[] = [];
    private dummy = new THREE.Object3D();

    // For calculating movement
    private position = new THREE.Vector3();
    private tangent = new THREE.Vector3();
    private binormal = new THREE.Vector3();
    private up = new THREE.Vector3(0, 1, 0);

    constructor(scene: THREE.Scene, maxPeople: number = 500) {
        this.maxPeople = maxPeople;

        // Simple pedestrian body (a small cylinder)
        // radius=0.15, height=0.6
        const geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
        // Shift geometry up so its bottom is on the ground (y=0) when placed
        geometry.translate(0, 0.3, 0);

        // We use slightly emissive material so they stand out in the dark neon city
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.1,
            emissive: 0xffffff,
            emissiveIntensity: 0.2 // Slight glow for cyberpunk vibe
        });

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxPeople);
        this.instancedMesh.count = 0;
        this.instancedMesh.castShadow = true;
        this.instancedMesh.receiveShadow = true;
        this.instancedMesh.frustumCulled = false;

        scene.add(this.instancedMesh);
    }

    public addPath(path: THREE.CatmullRomCurve3) {
        this.paths.push(path);
    }

    public spawnPerson(pathIndex: number) {
        if (this.people.length >= this.maxPeople || pathIndex >= this.paths.length) return;

        // Pedestrian color palette (cyberpunk-ish clothes)
        const palette = [0xff4444, 0x44ff44, 0x4444ff, 0xff00ff, 0x00ffff, 0xffff00, 0xffffff, 0x222222];
        const colorHex = palette[Math.floor(Math.random() * palette.length)];
        const color = new THREE.Color(colorHex);

        const pathLength = this.paths[pathIndex].getLength();
        // Target speed: walking pace. ~0.3 to 0.8 units per second.
        const unitsPerSecond = 0.3 + Math.random() * 0.5;
        const speed = unitsPerSecond / pathLength;

        // Spread pedestrians across the sidewalk. Offset from -0.8 to 0.8
        const offset = (Math.random() - 0.5) * 1.6;

        this.people.push({
            pathIndex,
            t: Math.random(), // Random starting position
            speed,
            offset,
            color
        });

        this.instancedMesh.setColorAt(this.people.length - 1, color);
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
        this.instancedMesh.count = this.people.length;
    }

    public update(dt: number) {
        if (this.paths.length === 0 || this.people.length === 0) return;

        for (let i = 0; i < this.people.length; i++) {
            const person = this.people[i];
            const path = this.paths[person.pathIndex];

            // Update path parameter t
            person.t += person.speed * dt;
            if (person.t >= 1.0) {
                person.t -= 1.0;
            }

            path.getPointAt(person.t, this.position);
            path.getTangentAt(person.t, this.tangent);
            this.binormal.crossVectors(this.up, this.tangent).normalize();

            this.position.addScaledVector(this.binormal, person.offset);

            // Add a slight "bobbing" effect to simulate walking
            // frequency based on speed
            const bobHeight = Math.abs(Math.sin(person.t * Math.PI * 40 * person.speed * path.getLength())) * 0.05;
            this.position.y += bobHeight;

            this.dummy.position.copy(this.position);

            const lookAtTarget = this.position.clone().add(this.tangent);
            // Ignore Y for lookAt to keep them upright
            lookAtTarget.y = this.position.y;
            this.dummy.lookAt(lookAtTarget);

            this.dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
}
