import * as THREE from 'three';
import { RiverGenerator } from './generators/RiverGenerator';
import { PathGenerator } from './generators/PathGenerator';
import { CommandHistory } from './CommandHistory';
import { TerrainSculptor } from './TerrainSculptor';

export type ToolType = 'River' | 'Path' | 'Road' | 'Crosswalk' | 'Raise' | 'Lower';

export class PathDrawer {
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private isDrawing = false;
    private currentPath: THREE.Vector3[] = [];
    private currentTool: ToolType | null = 'River';

    // Preview line during drawing
    private lineGeo = new THREE.BufferGeometry();
    private lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3, depthTest: false, transparent: true, opacity: 0.8 });
    private lineMesh = new THREE.Line(this.lineGeo, this.lineMat);

    // Ground object to raycast against
    private groundMesh: THREE.Object3D | null = null;

    private riverGenerator: RiverGenerator;
    private pathGenerator: PathGenerator;
    private terrainSculptor: TerrainSculptor | null = null;

    constructor(
        private camera: THREE.Camera,
        private scene: THREE.Scene,
        private domElement: HTMLElement
    ) {
        this.riverGenerator = new RiverGenerator(scene);
        this.pathGenerator = new PathGenerator(scene);

        this.lineMesh.renderOrder = 999;
        this.scene.add(this.lineMesh);

        domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
        domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
        domElement.addEventListener('pointerleave', this.onPointerUp.bind(this)); // Stop drawing if pointer leaves canvas
        domElement.addEventListener('contextmenu', e => e.preventDefault());
    }

    public setGround(ground: THREE.Object3D) {
        this.groundMesh = ground;
    }

    public setTerrainSculptor(sculptor: TerrainSculptor) {
        this.terrainSculptor = sculptor;

        // Listen for terrain updates (e.g. from the sculptor tool or undo actions)
        // to adjust river heights dynamically to stay inside their carved trench or on top of raised ground
        this.terrainSculptor.onTerrainUpdate((s) => {
            this.riverGenerator.rebuildAll((x, z) => s.getGroundHeightAtXZ(x, z));
        });
    }

    public setTool(tool: ToolType | null) {
        this.currentTool = tool;
        if (!tool) {
            this.lineGeo.setFromPoints([]); // Clear preview
            return;
        }

        if (tool === 'River') {
            this.lineMat.color.setHex(0x60a5fa); // Blue preview
        } else if (tool === 'Path') {
            this.lineMat.color.setHex(0xc4b28f); // Path preview
        } else if (tool === 'Road') {
            this.lineMat.color.setHex(0xffff44); // Road preview (yellow)
            this.lineMat.linewidth = 5;
        } else if (tool === 'Crosswalk') {
            this.lineMat.color.setHex(0xffffff); // Crosswalk preview (white)
            this.lineMat.linewidth = 5;
        }
    }

    public getCurrentTool(): ToolType | null {
        return this.currentTool;
    }

    private updateMouse(event: PointerEvent) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    private getIntersection(): THREE.Vector3 | null {
        if (!this.groundMesh) return null;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.groundMesh, true);

        if (intersects.length > 0) {
            return intersects[0].point;
        }
        return null;
    }

    private onPointerDown(event: PointerEvent) {
        if (event.button !== 0 || !['River', 'Path', 'Road', 'Crosswalk'].includes(this.currentTool!)) return; // Only draw on left click with valid tool
        this.updateMouse(event);
        const hitPoint = this.getIntersection();

        if (hitPoint) {
            this.isDrawing = true;
            this.currentPath = [hitPoint.clone()];
            this.updatePreviewLine();
        }
    }

    private onPointerMove(event: PointerEvent) {
        if (!this.isDrawing) return;

        this.updateMouse(event);
        const hitPoint = this.getIntersection();

        if (hitPoint) {
            if (this.currentTool === 'Road' || this.currentTool === 'Crosswalk') {
                // For Road/Crosswalk, we only care about start and end points for a straight line
                if (this.currentPath.length === 1) {
                    this.currentPath.push(hitPoint.clone());
                } else {
                    this.currentPath[1] = hitPoint.clone();
                }
                this.updatePreviewLine();
            } else {
                // Only add point if it's far enough from the last point to avoid dense overlapping points
                const lastPoint = this.currentPath[this.currentPath.length - 1];
                if (lastPoint.distanceTo(hitPoint) > 0.3) {
                    this.currentPath.push(hitPoint.clone());
                    this.updatePreviewLine();
                }
            }
        }
    }

    private onPointerUp(event: PointerEvent) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        // Ensure we have enough points (2 for straight road, 3+ for curve)
        const minPoints = (this.currentTool === 'Road' || this.currentTool === 'Crosswalk') ? 2 : 3;
        if (this.currentPath.length >= minPoints) {
            this.generatePathMesh();
        }

        // Clear preview line
        this.currentPath = [];
        this.updatePreviewLine();
    }

    private updatePreviewLine() {
        if (this.currentPath.length < 2) {
            this.lineGeo.setFromPoints([]);
            return;
        }
        // Raise line slightly to avoid z-fighting with the ground
        const displayPoints = this.currentPath.map(p => p.clone().add(new THREE.Vector3(0, 0.05, 0)));
        this.lineGeo.setFromPoints(displayPoints);
        this.lineGeo.attributes.position.needsUpdate = true;
    }

    private generatePathMesh() {
        let generatedMesh: THREE.Mesh | null = null;
        let terrainSnapshot: any = null;

        if (this.currentTool === 'River') {
            // Take snapshot of terrain before carving
            if (this.terrainSculptor) {
                terrainSnapshot = this.terrainSculptor.getSnapshot();

                // Carve the trench
                const trenchRadius = 0.6; // Slightly wider than river (0.8 / 2 = 0.4)
                const trenchDepth = 0.2;
                this.terrainSculptor.carveTrench(this.currentPath, trenchRadius, trenchDepth);
            }

            // We removed the manual path adjustment here so RiverGenerator can calculate 
            // the physics-based water level (lakes, waterfalls) directly.

            const getHeight = (x: number, z: number) => {
                return this.terrainSculptor ? this.terrainSculptor.getGroundHeightAtXZ(x, z) : 0;
            };

            generatedMesh = this.riverGenerator.generate(this.currentPath, getHeight);
        } else if (this.currentTool === 'Path' || this.currentTool === 'Road' || this.currentTool === 'Crosswalk') {
            const toolType = (this.currentTool === 'Path') ? 'Road' : this.currentTool; // Default to road if path
            generatedMesh = this.pathGenerator.generate(this.currentPath, toolType);
        }

        if (generatedMesh) {
            const mesh = generatedMesh;
            const tool = this.currentTool;
            const savedSnapshot = terrainSnapshot;
            CommandHistory.push(() => {
                if (tool === 'River') {
                    this.riverGenerator.remove(mesh);
                    if (this.terrainSculptor && savedSnapshot) {
                        this.terrainSculptor.restoreSnapshot(savedSnapshot);
                    }
                } else if (tool === 'Path' || tool === 'Road' || tool === 'Crosswalk') {
                    this.pathGenerator.remove(mesh);
                }
            });
        }
    }

    public clearAll() {
        this.riverGenerator.clear();
        this.pathGenerator.clear();
    }
}
