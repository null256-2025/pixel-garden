import * as THREE from 'three';

export class PathGenerator {
    private pathMeshes: THREE.Mesh[] = [];
    private material: THREE.MeshPhongMaterial;

    constructor(private scene: THREE.Scene) {
        // Flat shading dirt/stone path material
        this.material = new THREE.MeshPhongMaterial({
            color: 0xc4b28f, // Matching pathMat color in Buildings.ts
            flatShading: true,
        });
    }

    public generate(points: THREE.Vector3[], type: 'Road' | 'Crosswalk' = 'Road'): THREE.Mesh | null {
        if (points.length < 2) return null;

        // Start and end points only (straight line)
        const start = points[0]
        const end = points[points.length - 1]

        // 道路のマテリアル（ダークアスファルト＋フラットシェーディング）
        this.material = new THREE.MeshPhongMaterial({
            color: 0x26263b,
            flatShading: true,
            polygonOffset: true,
            polygonOffsetFactor: -1, // z-fighting対策
            polygonOffsetUnits: -1
        });

        // 長さと向きを計算
        const distance = start.distanceTo(end)
        const direction = new THREE.Vector3().subVectors(end, start).normalize()

        // 道路の幅と厚み
        const width = 1.2
        const depth = 0.04

        // 全体のグループ（親になるMesh）
        const geometry = new THREE.BoxGeometry(width, depth, distance)
        const mesh = new THREE.Mesh() // 空のメッシュを親にする

        if (type === 'Road') {
            const baseMesh = new THREE.Mesh(geometry, this.material)
            baseMesh.receiveShadow = true
            mesh.add(baseMesh)
        }

        if (type === 'Crosswalk') {
            // 横断歩道の白線パターン
            const stripeDepth = 0.05
            const stripeWidth = 0.8 // 道路幅より少し短い
            const stripeLength = 0.15 // 白線自体の幅
            const stripeGap = 0.15

            const stripeMat = new THREE.MeshPhongMaterial({
                color: 0xdddddd,
                flatShading: true,
                polygonOffset: true,
                polygonOffsetFactor: -10, // 確実にアスファルトより上に描画
                polygonOffsetUnits: -10
            })
            const stripeGeo = new THREE.BoxGeometry(stripeWidth, stripeDepth, stripeLength)

            // 距離に応じて縞模様を配置
            const totalStripes = Math.floor(distance / (stripeLength + stripeGap))
            const startZ = -distance / 2 + stripeLength / 2

            for (let i = 0; i < totalStripes; i++) {
                const stripe = new THREE.Mesh(stripeGeo, stripeMat)
                const zPos = startZ + i * (stripeLength + stripeGap)
                // ローカル座標で配置。Roadのベースメッシュに乗るように少し浮かす。
                // 重なった道路より確実に上に行くように大きめに浮かせる
                stripe.position.set(0, 0.04, zPos)
                stripe.receiveShadow = true
                mesh.add(stripe)
            }
        }

        // 位置を中間点に
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        mesh.position.copy(midPoint)
        // 地面に合わせる（微小な浮き）＋道路同士の重なり時のZファイティングを防ぐため微小なランダム値を追加
        mesh.position.y += 0.02 + Math.random() * 0.005

        // 向きを合わせる（BoxのZ軸をdirectionに向ける）
        const target = midPoint.clone().add(direction)
        mesh.lookAt(target)

        mesh.receiveShadow = true
        this.scene.add(mesh)
        this.pathMeshes.push(mesh)
        return mesh
    }

    public remove(mesh: THREE.Mesh) {
        const idx = this.pathMeshes.indexOf(mesh);
        if (idx !== -1) {
            this.pathMeshes.splice(idx, 1);
            this.scene.remove(mesh);
            mesh.geometry.dispose();
        }
    }

    public clear() {
        this.pathMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
        });
        this.pathMeshes = [];
    }
}
