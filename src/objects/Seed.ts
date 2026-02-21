import * as THREE from 'three';

export function makeSeed(scene: THREE.Scene, x: number, z: number): THREE.Mesh {
    const seedGeo = new THREE.SphereGeometry(0.04, 8, 8);
    // Dark brown/black seed
    const seedMat = new THREE.MeshPhongMaterial({ color: 0x221100, flatShading: true });

    const seed = new THREE.Mesh(seedGeo, seedMat);
    seed.position.set(x, 0.02, z); // slight offset so it rests on ground
    seed.castShadow = true;

    scene.add(seed);
    return seed;
}
