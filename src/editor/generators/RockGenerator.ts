import * as THREE from 'three';

export class RockGenerator {
    private rockMat: THREE.MeshPhongMaterial;

    constructor(private scene: THREE.Scene) {
        this.rockMat = new THREE.MeshPhongMaterial({
            color: 0x888888, // Gray rock color
            flatShading: true
        });
    }

    public generate(position: THREE.Vector3): THREE.Mesh {
        // Randomize size slightly
        const radius = 0.2 + Math.random() * 0.3;
        const detail = 0; // Icosahedron detail, 0 looks like low-poly rocks
        const geometry = new THREE.IcosahedronGeometry(radius, detail);

        // Displace vertices to make it look like a natural, jagged rock
        const positions = geometry.attributes.position;
        const v = new THREE.Vector3();

        for (let i = 0; i < positions.count; i++) {
            v.fromBufferAttribute(positions, i);
            // Random displacement factor
            v.multiplyScalar(1.0 + (Math.random() - 0.5) * 0.4);
            positions.setXYZ(i, v.x, v.y, v.z);
        }

        geometry.computeVertexNormals();

        const rock = new THREE.Mesh(geometry, this.rockMat);

        // Push it into the ground slightly
        rock.position.copy(position);
        rock.position.y += radius * 0.3; // Center is above ground, bottom is buried

        // Random rotation
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        rock.castShadow = true;
        rock.receiveShadow = true;

        this.scene.add(rock);
        return rock;
    }
}
