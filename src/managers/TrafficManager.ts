import * as THREE from 'three';

interface CarData {
    pathIndex: number;
    t: number;      // 0.0 to 1.0 position on curve
    speed: number;  // Path traversal speed
    offset: number; // Lateral offset (lanes)
    color: THREE.Color;
}

export class TrafficManager {
    private instancedMesh: THREE.InstancedMesh;
    private maxCars: number;
    private paths: THREE.CatmullRomCurve3[] = [];
    private cars: CarData[] = [];
    private dummy = new THREE.Object3D();

    // For calculating movement to avoid instantiating new vectors each frame
    private position = new THREE.Vector3();
    private tangent = new THREE.Vector3();
    private binormal = new THREE.Vector3();
    private up = new THREE.Vector3(0, 1, 0);

    constructor(scene: THREE.Scene, maxCars: number = 200) {
        this.maxCars = maxCars;

        // Simple car body (a box for phase 1)
        // Length=1.5 (Z axis typically forward in local space initially, but lookAt aligns it)
        const geometry = new THREE.BoxGeometry(0.8, 0.4, 1.5);
        // Shift geometry up so its bottom is on the ground (y=0) when placed
        geometry.translate(0, 0.2, 0);

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff, // Base color; instanced mesh colors will multiply this
            roughness: 0.3,
            metalness: 0.8
        });

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxCars);
        this.instancedMesh.count = 0;
        this.instancedMesh.castShadow = true;
        this.instancedMesh.receiveShadow = true;
        this.instancedMesh.frustumCulled = false; // Prevent culling issues with instances

        scene.add(this.instancedMesh);
    }

    public addPath(path: THREE.CatmullRomCurve3) {
        this.paths.push(path);
    }

    public spawnCar(pathIndex: number) {
        if (this.cars.length >= this.maxCars || pathIndex >= this.paths.length) return;

        // Car color palette: dark grays, silvers, occasional reds/blues/whites
        const palette = [0x222222, 0x444444, 0x111111, 0xdddddd, 0x880000, 0x000044, 0x223322];
        const colorHex = palette[Math.floor(Math.random() * palette.length)];
        const color = new THREE.Color(colorHex);

        const pathLength = this.paths[pathIndex].getLength();
        // Target speed: approx 1.5 to 3.0 units per second (slower for miniature scale).
        const unitsPerSecond = 1.5 + Math.random() * 1.5;
        const speed = unitsPerSecond / pathLength;

        // Spread cars slightly across the road. Offset from -0.75 to 0.75
        const offset = (Math.random() - 0.5) * 1.5;

        this.cars.push({
            pathIndex,
            t: Math.random(), // Random starting position along the track
            speed,
            offset,
            color
        });

        // Set the color for this instance immediately
        this.instancedMesh.setColorAt(this.cars.length - 1, color);
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
        this.instancedMesh.count = this.cars.length;
    }

    public update(dt: number) {
        if (this.paths.length === 0 || this.cars.length === 0) return;

        for (let i = 0; i < this.cars.length; i++) {
            const car = this.cars[i];
            const path = this.paths[car.pathIndex];

            // Update path parameter t
            car.t += car.speed * dt;
            if (car.t >= 1.0) {
                car.t -= 1.0;
            }

            // Get point and tangent at current t
            path.getPointAt(car.t, this.position);
            path.getTangentAt(car.t, this.tangent);

            // Calculate binormal: Up crossed with Tangent gives a vector pointing left/right
            this.binormal.crossVectors(this.up, this.tangent).normalize();

            // Apply lateral offset to place car in a specific "lane"
            this.position.addScaledVector(this.binormal, car.offset);

            // Update dummy transform
            this.dummy.position.copy(this.position);

            // Look exactly along the tangent
            const lookAtTarget = this.position.clone().add(this.tangent);
            this.dummy.lookAt(lookAtTarget);

            this.dummy.updateMatrix();

            // Apply the matrix to the instance
            this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
}
