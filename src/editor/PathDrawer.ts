import * as THREE from 'three';
import { RiverGenerator } from './generators/RiverGenerator';
import { PathGenerator } from './generators/PathGenerator';

export type ToolType = 'River' | 'Path';

export class PathDrawer {
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private isDrawing = false;
    private currentPath: THREE.Vector3[] = [];
    private currentTool: ToolType = 'River';

    // Preview line during drawing
    private lineGeo = new THREE.BufferGeometry();
    private lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3, depthTest: false, transparent: true, opacity: 0.8 });
    private lineMesh = new THREE.Line(this.lineGeo, this.lineMat);

    // Ground object to raycast against
    private groundMesh: THREE.Object3D | null = null;

    private riverGenerator: RiverGenerator;
    private pathGenerator: PathGenerator;

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

    public setTool(tool: ToolType) {
        this.currentTool = tool;
        if (tool === 'River') {
            this.lineMat.color.setHex(0x60a5fa); // Blue preview
        } else {
            this.lineMat.color.setHex(0xc4b28f); // Path preview
        }
    }

    public getCurrentTool(): ToolType {
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
        if (event.button !== 0) return; // Only draw on left click
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
            // Only add point if it's far enough from the last point to avoid dense overlapping points
            const lastPoint = this.currentPath[this.currentPath.length - 1];
            if (lastPoint.distanceTo(hitPoint) > 0.3) {
                this.currentPath.push(hitPoint.clone());
                this.updatePreviewLine();
            }
        }
    }

    private onPointerUp(event: PointerEvent) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        // Ensure we have enough points to build a curve
        if (this.currentPath.length > 2) {
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
        if (this.currentTool === 'River') {
            this.riverGenerator.generate(this.currentPath);
        } else {
            this.pathGenerator.generate(this.currentPath);
        }
    }

    public clearAll() {
        this.riverGenerator.clear();
        this.pathGenerator.clear();
    }
}
