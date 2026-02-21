import * as THREE from 'three';

export class RiverGenerator {
    private riverData: { group: THREE.Mesh | THREE.Group, basePoints: THREE.Vector3[], meshes: THREE.Mesh[] }[] = [];
    private material: THREE.MeshPhongMaterial;

    constructor(private scene: THREE.Scene) {
        // Flat shading blue water material
        this.material = new THREE.MeshPhongMaterial({
            color: 0x60a5fa,
            flatShading: true,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide // Allow viewing water from below (e.g. at waterfalls)
        });
    }

    public generate(points: THREE.Vector3[], getGroundHeightAtXZ: (x: number, z: number) => number): THREE.Mesh | null {
        if (points.length < 2) return null;

        const basePoints = points.map(p => new THREE.Vector3(p.x, 0, p.z));

        // We might generate multiple meshes if the river is split by high terrain
        const segments = this.calculateWaterPath(basePoints, getGroundHeightAtXZ);
        const meshes: THREE.Mesh[] = [];

        for (const segment of segments) {
            const mesh = this.createMesh(segment);
            if (mesh) {
                this.scene.add(mesh);
                meshes.push(mesh);
            }
        }

        // We wrap the meshes in a Group so the editor can treat it as one "River" object
        const group = new THREE.Group();
        meshes.forEach(m => group.add(m));
        this.scene.add(group);

        const riverObj = group as unknown as THREE.Mesh; // Hacky cast to keep external API simple
        this.riverData.push({ group: riverObj, basePoints, meshes });

        return riverObj;
    }

    private calculateWaterPath(basePoints: THREE.Vector3[], getGroundHeightAtXZ: (x: number, z: number) => number): THREE.Vector3[][] {
        const n = basePoints.length;
        if (n < 2) return [];

        const G = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            G[i] = getGroundHeightAtXZ(basePoints[i].x, basePoints[i].z);
        }

        const max_ahead = new Float32Array(n);
        max_ahead[n - 1] = G[n - 1];
        for (let i = n - 2; i >= 0; i--) {
            max_ahead[i] = Math.max(G[i], max_ahead[i + 1]);
        }

        const W = new Float32Array(n);
        W[0] = G[0];
        for (let i = 1; i < n; i++) {
            W[i] = Math.max(G[i], Math.min(W[i - 1], max_ahead[i]));
        }

        const waterHeightOffset = 0.05;
        const resultSegments: THREE.Vector3[][] = [];
        let currentSegment: THREE.Vector3[] = [];

        for (let i = 0; i < n; i++) {
            // If the calculated water level W[i] is basically equal to the ground G[i] 
            // AND we're forced up by terrain later on but the *actual* water would be underground,
            // we should cut it off.
            // A simpler visual logic: if the terrain is significantly higher than the previous water level,
            // the water gets blocked and absorbed into the ground.

            // For a peaceful garden building game: 
            // Let the river flow exactly downhill from the start. Water cannot rise.
            // If terrain goes up, water stops.

            // Let's use a simpler falling-water model:
            // Water starts at height H. It only goes down.
            // If ground > water height, water is hidden (buried).

            break; // Let's rewrite the physics completely below to be simpler and look better.
        }

        // --- Simpler / Better Water Logic --- //
        // 1. Water always starts at the height of the first point.
        // 2. Water can only flow DOWN (can't flow over hills).
        // 3. If water hits a hill (ground > water), it gets buried and we don't draw it.
        // Wait, if it's a lake, it should stay flat.

        const waterHeights = new Float32Array(n);
        let currentWaterH = G[0];

        for (let i = 0; i < n; i++) {
            // Water falls if ground drops
            if (G[i] < currentWaterH) {
                currentWaterH = G[i];
            }
            waterHeights[i] = currentWaterH;
        }

        // Now split into segments where water is visible
        currentSegment = [];
        for (let i = 0; i < n; i++) {
            // Is water visible?
            // Water is visible if ground is NOT strictly higher than water.
            // Give a tiny tolerance so it doesn't flicker.
            if (G[i] <= waterHeights[i] + 0.1) {
                currentSegment.push(new THREE.Vector3(basePoints[i].x, waterHeights[i] + waterHeightOffset, basePoints[i].z));
            } else {
                // Ground blocks the water. End segment.
                if (currentSegment.length >= 2) {
                    resultSegments.push([...currentSegment]);
                }
                currentSegment = [];
            }
        }

        if (currentSegment.length >= 2) {
            resultSegments.push(currentSegment);
        }

        return resultSegments;
    }

    private createMesh(points: THREE.Vector3[]): THREE.Mesh | null {
        if (points.length < 2) return null;

        // Create a custom BufferGeometry (a flat ribbon) instead of ExtrudeGeometry
        // This avoids weird geometry twists or walls when the path has sharp turns or is short.

        const width = 0.8;
        const halfWidth = width / 2;

        // We will build a series of quads (2 triangles each) along the path
        const numSegments = points.length - 1;
        const numVertices = points.length * 2; // Left and Right vertex per point
        const positions = new Float32Array(numVertices * 3);
        const indices: number[] = [];

        // Calculate left and right points for each spine point
        for (let i = 0; i < points.length; i++) {
            const current = points[i];

            // Determine direction of the river to calculate left/right perpendiculars
            let dir = new THREE.Vector3();
            if (i === 0) {
                dir.subVectors(points[1], current).normalize();
            } else if (i === points.length - 1) {
                dir.subVectors(current, points[i - 1]).normalize();
            } else {
                // Average direction from previous to next
                const prev = points[i - 1];
                const next = points[i + 1];
                dir.subVectors(next, prev).normalize();
            }

            // Perpendicular to direction and Y-up
            const right = new THREE.Vector3(dir.z, 0, -dir.x).normalize();

            // Left vertex
            const leftV = current.clone().addScaledVector(right, -halfWidth);
            // Right vertex
            const rightV = current.clone().addScaledVector(right, halfWidth);

            const vIdx = i * 6;
            positions[vIdx + 0] = leftV.x;
            positions[vIdx + 1] = leftV.y;
            positions[vIdx + 2] = leftV.z;

            positions[vIdx + 3] = rightV.x;
            positions[vIdx + 4] = rightV.y;
            positions[vIdx + 5] = rightV.z;
        }

        // Generate triangle indices
        for (let i = 0; i < numSegments; i++) {
            const left0 = i * 2;
            const right0 = i * 2 + 1;
            const left1 = i * 2 + 2;
            const right1 = i * 2 + 3;

            // Triangle 1: left0 -> right0 -> left1
            indices.push(left0, right0, left1);
            // Triangle 2: right0 -> right1 -> left1
            indices.push(right0, right1, left1);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals(); // Required for shading

        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.receiveShadow = true;
        return mesh;
    }

    public rebuildAll(getGroundHeightAtXZ: (x: number, z: number) => number) {
        for (const data of this.riverData) {
            const segments = this.calculateWaterPath(data.basePoints, getGroundHeightAtXZ);

            // Dispose old meshes
            data.meshes.forEach(m => {
                this.scene.remove(m);
                if (data.group instanceof THREE.Group) {
                    data.group.remove(m);
                }
                m.geometry.dispose();
            });
            data.meshes = [];

            // Re-create the geometry for visible segments
            for (const segment of segments) {
                const newMesh = this.createMesh(segment);
                if (newMesh) {
                    if (data.group instanceof THREE.Group) {
                        data.group.add(newMesh);
                    }
                    this.scene.add(newMesh);
                    data.meshes.push(newMesh);
                }
            }
        }
    }

    public remove(riverObj: THREE.Mesh | THREE.Group) {
        const idx = this.riverData.findIndex(d => d.group === riverObj);
        if (idx !== -1) {
            const data = this.riverData.splice(idx, 1)[0];
            data.meshes.forEach(m => {
                this.scene.remove(m);
                m.geometry.dispose();
            });
            this.scene.remove(riverObj);
        }
    }

    public clear() {
        this.riverData.forEach(data => {
            data.meshes.forEach(m => {
                this.scene.remove(m);
                m.geometry.dispose();
            });
            this.scene.remove(data.group);
        });
        this.riverData = [];
    }
}
