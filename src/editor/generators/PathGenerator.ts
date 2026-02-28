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

    public generate(points: THREE.Vector3[], type: 'Road' | 'Sidewalk' | 'Crosswalk' = 'Road'): THREE.Mesh | null {
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
        const mesh = new THREE.Mesh(geometry, this.material)

        if (type === 'Sidewalk') {
            // 歩道部分（両サイドに一段高いコンクリート）
            const swWidth = 0.3
            const swDepth = 0.08
            const swMat = new THREE.MeshPhongMaterial({
                color: 0x555566,
                flatShading: true,
            })
            const swGeo = new THREE.BoxGeometry(swWidth, swDepth, distance)

            const leftSW = new THREE.Mesh(swGeo, swMat)
            leftSW.position.set(-width / 2 - swWidth / 2, 0.02, 0)
            leftSW.receiveShadow = true
            mesh.add(leftSW)

            const rightSW = new THREE.Mesh(swGeo, swMat)
            rightSW.position.set(width / 2 + swWidth / 2, 0.02, 0)
            rightSW.receiveShadow = true
            mesh.add(rightSW)
        } else if (type === 'Crosswalk') {
            // 横断歩道の白線パターン
            const stripeDepth = 0.05
            const stripeWidth = 0.8 // 道路幅より少し短い
            const stripeLength = 0.15 // 白線自体の幅
            const stripeGap = 0.15

            const stripeMat = new THREE.MeshPhongMaterial({
                color: 0xdddddd,
                flatShading: true,
                polygonOffset: true,
                polygonOffsetFactor: -2, // アスファルトより上に描画
                polygonOffsetUnits: -2
            })
            const stripeGeo = new THREE.BoxGeometry(stripeWidth, stripeDepth, stripeLength)

            // 距離に応じて縞模様を配置
            const totalStripes = Math.floor(distance / (stripeLength + stripeGap))
            const startZ = -distance / 2 + stripeLength / 2

            for (let i = 0; i < totalStripes; i++) {
                const stripe = new THREE.Mesh(stripeGeo, stripeMat)
                const zPos = startZ + i * (stripeLength + stripeGap)
                // ローカル座標で配置
                stripe.position.set(0, 0.02, zPos)
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
