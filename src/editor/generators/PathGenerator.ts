import * as THREE from 'three';

export class PathGenerator {
    private pathMeshes: THREE.Mesh[] = [];
    private material: THREE.MeshPhongMaterial;

    constructor(private scene: THREE.Scene) {
        // Flat shading dirt/stone path material
        this.material = new THREE.MeshPhongMaterial({
            color: 0xc4b28f, // Matching pathMat color in House.ts
            flatShading: true,
        });
    }

    public generate(points: THREE.Vector3[]) {
        if (points.length < 2) return;

        // Create a smooth curve through the points
        const curve = new THREE.CatmullRomCurve3(points);

        // Define the cross-section of the path (thinner than a river)
        // Swapping X and Y to make it lay flat on the ground instead of standing up.
        const width = 0.4;
        const depth = 0.01;
        const shape = new THREE.Shape();
        shape.moveTo(-depth / 2, -width / 2);
        shape.lineTo(depth / 2, -width / 2);
        shape.lineTo(depth / 2, width / 2);
        shape.lineTo(-depth / 2, width / 2);
        shape.lineTo(-depth / 2, -width / 2);

        // Extrude the shape along the curve
        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
            steps: points.length * 2, // Resolution
            bevelEnabled: false,
            extrudePath: curve
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const mesh = new THREE.Mesh(geometry, this.material);

        // Ensure the path sits slightly above the ground to prevent z-fighting
        mesh.position.y += 0.03;

        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.pathMeshes.push(mesh);
    }

    public clear() {
        this.pathMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
        });
        this.pathMeshes = [];
    }
}
