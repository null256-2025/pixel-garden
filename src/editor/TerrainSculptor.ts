import * as THREE from 'three';
import { CommandHistory } from './CommandHistory';

export class TerrainSculptor {
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private isSculpting = false;
    private currentTool: 'Raise' | 'Lower' | null = null;

    // Brush settings
    private brushRadius = 1.0;
    private brushStrength = 0.05;

    // The ground mesh
    private groundMesh: THREE.Mesh | null = null;
    private originalPositions: Float32Array | null = null;
    private originalColors: Float32Array | null = null;

    private sculptSnapshot: { positions: Float32Array, colors: Float32Array | null } | null = null;
    private hasModificationsThisStroke = false;

    // Callbacks for terrain height updates
    private updateListeners: ((sculptor: TerrainSculptor) => void)[] = [];

    // House protection zone details
    // Assuming house is centered near origin. Let's protect an area of 3x3 around origin.
    private protectedZone = { minX: -2.0, maxX: 2.0, minZ: -1.5, maxZ: 1.5 };

    constructor(
        private camera: THREE.Camera,
        private domElement: HTMLElement
    ) {
        domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
        domElement.addEventListener('pointerleave', this.onPointerUp.bind(this));
    }

    public setGround(ground: THREE.Object3D) {
        if (ground instanceof THREE.Mesh) {
            this.groundMesh = ground;
            // Store a copy of the original vertex positions if we ever wanted to reset,
            // but for now we just use the current positions.
            const positions = this.groundMesh.geometry.attributes.position;
            this.originalPositions = new Float32Array(positions.array);

            const colors = this.groundMesh.geometry.attributes.color;
            if (colors) {
                this.originalColors = new Float32Array(colors.array);
            }
        }
    }

    public onTerrainUpdate(callback: (sculptor: TerrainSculptor) => void) {
        this.updateListeners.push(callback);
    }

    public getGroundHeightAtXZ(x: number, z: number): number {
        if (!this.groundMesh) return 0;

        // Raycast down from high up to find the exact local height
        const rayOrigin = new THREE.Vector3(x, 10, z);
        const rayDir = new THREE.Vector3(0, -1, 0);

        const ray = new THREE.Raycaster(rayOrigin, rayDir);
        const intersects = ray.intersectObject(this.groundMesh, false);

        if (intersects.length > 0) {
            return intersects[0].point.y;
        }
        return 0; // Default flat ground height
    }

    public setTool(tool: 'Raise' | 'Lower' | null) {
        this.currentTool = tool;
    }

    private updateMouse(event: PointerEvent) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    private getIntersection(): THREE.Vector3 | null {
        if (!this.groundMesh) return null;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Raycast against the ground mesh
        const intersects = this.raycaster.intersectObject(this.groundMesh, false);

        if (intersects.length > 0) {
            return intersects[0].point;
        }
        return null;
    }

    private onPointerDown(event: PointerEvent) {
        if (event.button !== 0 || !this.currentTool) return;
        this.isSculpting = true;
        this.updateMouse(event);

        if (this.groundMesh) {
            this.sculptSnapshot = {
                positions: new Float32Array(this.groundMesh.geometry.attributes.position.array),
                colors: this.groundMesh.geometry.attributes.color ? new Float32Array(this.groundMesh.geometry.attributes.color.array) : null
            };
            this.hasModificationsThisStroke = false;
        }

        this.applyBrush();
    }

    private onPointerMove(event: PointerEvent) {
        if (!this.isSculpting || !this.currentTool) return;
        this.updateMouse(event);
        this.applyBrush();
    }

    private onPointerUp(event: PointerEvent) {
        if (event.button === 0) {
            this.isSculpting = false;

            if (this.hasModificationsThisStroke && this.sculptSnapshot) {
                const snapshot = this.sculptSnapshot;
                CommandHistory.push(() => {
                    if (!this.groundMesh) return;
                    const geometry = this.groundMesh.geometry;
                    (geometry.attributes.position.array as Float32Array).set(snapshot.positions);
                    geometry.attributes.position.needsUpdate = true;
                    if (snapshot.colors && geometry.attributes.color) {
                        (geometry.attributes.color.array as Float32Array).set(snapshot.colors);
                        geometry.attributes.color.needsUpdate = true;
                    }
                    geometry.computeVertexNormals();
                    geometry.computeBoundingBox();
                    geometry.computeBoundingSphere();
                    this.updateListeners.forEach(cb => cb(this));
                });
            }
            this.sculptSnapshot = null;
        }
    }

    private isVertexProtected(v: THREE.Vector3): boolean {
        return (v.x >= this.protectedZone.minX && v.x <= this.protectedZone.maxX &&
            v.z >= this.protectedZone.minZ && v.z <= this.protectedZone.maxZ);
    }

    private applyBrush() {
        if (!this.groundMesh) return;

        const hitPoint = this.getIntersection();
        if (!hitPoint) return;

        // Convert hitPoint to local space of the ground mesh
        const localHit = this.groundMesh.worldToLocal(hitPoint.clone());

        const geometry = this.groundMesh.geometry;
        const positions = geometry.attributes.position;
        const colors = geometry.attributes.color;

        const direction = this.currentTool === 'Raise' ? 1 : -1;
        const amount = this.brushStrength * direction;

        let verticesModified = false;

        const v = new THREE.Vector3();
        const baseHeight = 0.2; // Box top face Y (groundHeight was 0.4)
        const cGrass = new THREE.Color(0x5a9a3c);
        const cDirt = new THREE.Color(0x8B6914);

        // Loop through all vertices and adjust if within radius
        // Since geometries are non-indexed with flat shading, multiple vertices might share the same spatial coordinate.
        // We modify all vertices that fall within the brush radius.
        for (let i = 0; i < positions.count; i++) {
            v.fromBufferAttribute(positions, i);

            // Only modify vertices that belong to the top surface (y > 0 relative to ground center)
            if (v.y < 0) continue;

            // Calculate distance in XZ plane (ignoring height differences for brush radius)
            const dx = v.x - localHit.x;
            const dz = v.z - localHit.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < this.brushRadius) {
                // Check protection zone using world coordinates
                const worldV = this.groundMesh.localToWorld(v.clone());
                if (this.isVertexProtected(worldV)) {
                    continue;
                }

                // Smooth falloff (Cosine bell)
                const falloff = (Math.cos(Math.PI * (dist / this.brushRadius)) + 1) / 2;

                // Add height
                v.y += amount * falloff;

                // Optional clamping to prevent extreme spikes or deep holes
                v.y = THREE.MathUtils.clamp(v.y, 0, 1.5);

                positions.setY(i, v.y);

                // Update vertex color based on how low it is
                if (colors) {
                    const dirtFactor = 1.0 - THREE.MathUtils.smoothstep(v.y, 0.05, 0.18);
                    const mixed = cGrass.clone().lerp(cDirt, dirtFactor);
                    colors.setXYZ(i, mixed.r, mixed.g, mixed.b);
                }

                verticesModified = true;
            }
        }

        if (verticesModified) {
            this.hasModificationsThisStroke = true;
            positions.needsUpdate = true;
            if (colors) colors.needsUpdate = true;
            geometry.computeVertexNormals(); // Recompute lighting
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();

            // Notify listeners that terrain height has changed
            this.updateListeners.forEach(cb => cb(this));
        }
    }

    public clearAll() {
        if (!this.groundMesh || !this.originalPositions) return;
        const geometry = this.groundMesh.geometry;
        const positions = geometry.attributes.position;
        const colors = geometry.attributes.color;

        // Restore all original positions
        (positions.array as Float32Array).set(this.originalPositions);
        positions.needsUpdate = true;

        // Restore colors if available
        if (colors && this.originalColors) {
            (colors.array as Float32Array).set(this.originalColors);
            colors.needsUpdate = true;
        }

        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        // Notify listeners
        this.updateListeners.forEach(cb => cb(this));
    }
}
