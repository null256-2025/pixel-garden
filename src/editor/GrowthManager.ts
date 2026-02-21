import * as THREE from 'three';
import { makeFlowerbed } from '../objects/Flowerbeds';

interface SeedData {
    mesh: THREE.Object3D;
    isGrown: boolean;
    plantedTime: number;
    growTimeSeconds: number;
}

export class GrowthManager {
    private seeds: SeedData[] = [];
    private trackingObjects: THREE.Object3D[] = []; // Reference to NaturePlacer's array to swap objects
    private evolvedSeeds = new Map<THREE.Object3D, THREE.Object3D>();

    constructor(private scene: THREE.Scene) { }

    public registerTrackingArray(arrayRef: THREE.Object3D[]) {
        this.trackingObjects = arrayRef;
    }

    public addSeed(seedMesh: THREE.Mesh) {
        this.seeds.push({
            mesh: seedMesh,
            isGrown: false,
            plantedTime: performance.now(),
            growTimeSeconds: 5 + Math.random() * 5 // Grow between 5 and 10 seconds
        });
    }

    public removeSeed(originalSeedMesh: THREE.Object3D) {
        const index = this.seeds.findIndex(s => s.mesh === originalSeedMesh);
        if (index !== -1) {
            this.scene.remove(originalSeedMesh);
            this.seeds.splice(index, 1);

            const trackingIndex = this.trackingObjects.indexOf(originalSeedMesh);
            if (trackingIndex !== -1) {
                this.trackingObjects.splice(trackingIndex, 1);
            }
        } else if (this.evolvedSeeds.has(originalSeedMesh)) {
            const evolved = this.evolvedSeeds.get(originalSeedMesh)!;
            this.scene.remove(evolved);
            this.evolvedSeeds.delete(originalSeedMesh);

            const trackingIndex = this.trackingObjects.indexOf(evolved);
            if (trackingIndex !== -1) {
                this.trackingObjects.splice(trackingIndex, 1);
            }
        }
    }

    public update(currentTime: number) {
        for (let i = this.seeds.length - 1; i >= 0; i--) {
            const seed = this.seeds[i];
            const elapsedSec = (currentTime - seed.plantedTime) / 1000;

            // Simple "pulsing" animation for the seed while growing
            const pulse = 1.0 + Math.sin(elapsedSec * 5) * 0.2;
            seed.mesh.scale.set(pulse, pulse, pulse);

            if (elapsedSec >= seed.growTimeSeconds) {
                // Time to grow! Replace seed with flowerbed
                this.growToFlowerbed(seed, i);
            }
        }
    }

    private growToFlowerbed(seed: SeedData, index: number) {
        // Remove seed
        this.scene.remove(seed.mesh);
        this.seeds.splice(index, 1);

        // Remove from tracking array so it doesn't leak memory or ghost positions
        const trackingIndex = this.trackingObjects.indexOf(seed.mesh);
        if (trackingIndex !== -1) {
            this.trackingObjects.splice(trackingIndex, 1);
        }
        const originalMesh = seed.mesh;

        // Spawn a small simple flowerbed
        const pos = seed.mesh.position;
        // makeFlowerbed uses (scene, x, z, bedW, bedD, flowerCount, rotY)
        const rotY = Math.random() * Math.PI;
        const newBed = makeFlowerbed(this.scene, pos.x, pos.z, 0.5, 0.5, 3, rotY);
        newBed.position.y = pos.y - 0.02; // Account for the seed offset we had

        // Add the new bed to tracking
        this.trackingObjects.push(newBed);

        // Update seed record so Undo can find the evolved mesh
        this.evolvedSeeds.set(originalMesh, newBed);
        seed.mesh = newBed;
        seed.isGrown = true;
    }
}
