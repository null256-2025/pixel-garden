import * as THREE from 'three';
import { makeNeonSign } from '../objects/NeonSigns';

interface SpawnData {
    mesh: THREE.Object3D;
    hasSpawned: boolean;
    placedTime: number;
    spawnDelaySeconds: number;
}

export class SpawnManager {
    private spawnPoints: SpawnData[] = [];
    private trackingObjects: THREE.Object3D[] = []; // Reference to NaturePlacer's array to swap objects
    private spawnedObjects = new Map<THREE.Object3D, THREE.Object3D>();

    constructor(private scene: THREE.Scene) { }

    public registerTrackingArray(arrayRef: THREE.Object3D[]) {
        this.trackingObjects = arrayRef;
    }

    public addSpawnPoint(markerMesh: THREE.Mesh) {
        this.spawnPoints.push({
            mesh: markerMesh,
            hasSpawned: false,
            placedTime: performance.now(),
            spawnDelaySeconds: 5 + Math.random() * 5 // Spawn between 5 and 10 seconds
        });
    }

    public removeSpawnPoint(originalMarkerMesh: THREE.Object3D) {
        const index = this.spawnPoints.findIndex(s => s.mesh === originalMarkerMesh);
        if (index !== -1) {
            this.scene.remove(originalMarkerMesh);
            this.spawnPoints.splice(index, 1);

            const trackingIndex = this.trackingObjects.indexOf(originalMarkerMesh);
            if (trackingIndex !== -1) {
                this.trackingObjects.splice(trackingIndex, 1);
            }
        } else if (this.spawnedObjects.has(originalMarkerMesh)) {
            const spawned = this.spawnedObjects.get(originalMarkerMesh)!;
            this.scene.remove(spawned);
            this.spawnedObjects.delete(originalMarkerMesh);

            const trackingIndex = this.trackingObjects.indexOf(spawned);
            if (trackingIndex !== -1) {
                this.trackingObjects.splice(trackingIndex, 1);
            }
        }
    }

    public update(currentTime: number) {
        for (let i = this.spawnPoints.length - 1; i >= 0; i--) {
            const sp = this.spawnPoints[i];
            const elapsedSec = (currentTime - sp.placedTime) / 1000;

            // Simple "pulsing" animation for the marker while waiting to spawn
            const pulse = 1.0 + Math.sin(elapsedSec * 5) * 0.2;
            sp.mesh.scale.set(pulse, pulse, pulse);

            if (elapsedSec >= sp.spawnDelaySeconds) {
                // Time to spawn! Replace marker with neon sign
                this.spawnNeonSign(sp, i);
            }
        }
    }

    private spawnNeonSign(sp: SpawnData, index: number) {
        // Remove marker
        this.scene.remove(sp.mesh);
        this.spawnPoints.splice(index, 1);

        // Remove from tracking array
        const trackingIndex = this.trackingObjects.indexOf(sp.mesh);
        if (trackingIndex !== -1) {
            this.trackingObjects.splice(trackingIndex, 1);
        }
        const originalMesh = sp.mesh;

        // Spawn a small neon sign
        const pos = sp.mesh.position;
        const rotY = Math.random() * Math.PI;
        const newSign = makeNeonSign(this.scene, pos.x, pos.z, 0.5, 0.3, rotY);
        newSign.position.y = pos.y - 0.02;

        // Add the new sign to tracking
        this.trackingObjects.push(newSign);

        // Update record so Undo can find the spawned mesh
        this.spawnedObjects.set(originalMesh, newSign);
        sp.mesh = newSign;
        sp.hasSpawned = true;
    }
}
