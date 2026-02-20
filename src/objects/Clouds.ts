import * as THREE from "three"

/**
 * 雲を複数作成してシーンに追加する
 * 返り値の配列をアニメーションループに渡して移動させる
 */
export function createClouds(scene: THREE.Scene): THREE.Group[] {

    const cloudMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        flatShading: true,
        transparent: true,
        opacity: 0.85
    })

    const clouds: THREE.Group[] = []

    // 雲を一つ作る関数（複数のSphereの塊）
    function makeCloud(x: number, y: number, z: number, scale: number) {
        const cloudGroup = new THREE.Group()

        // 中央の大きな玉
        const center = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 6, 4),
            cloudMat
        )
        cloudGroup.add(center)

        // 左側
        const left = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 5, 4),
            cloudMat
        )
        left.position.set(-0.4, -0.05, 0)
        cloudGroup.add(left)

        // 右側
        const right = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 5, 4),
            cloudMat
        )
        right.position.set(0.45, -0.05, 0.1)
        cloudGroup.add(right)

        // 奥側
        const back = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 5, 4),
            cloudMat
        )
        back.position.set(0.1, 0.05, -0.3)
        cloudGroup.add(back)

        cloudGroup.position.set(x, y, z)
        cloudGroup.scale.set(scale, scale * 0.5, scale)
        scene.add(cloudGroup)

        return cloudGroup
    }

    // 複数の雲を配置
    clouds.push(makeCloud(-2, 5, -3, 1.2))
    clouds.push(makeCloud(3, 5.5, -4, 0.9))
    clouds.push(makeCloud(0, 6, -5, 1.5))
    clouds.push(makeCloud(-4, 5.2, -2, 0.7))
    clouds.push(makeCloud(5, 5.8, -3.5, 1.0))

    return clouds
}

/**
 * 雲を毎フレーム移動させるアニメーション更新関数
 */
export function updateClouds(clouds: THREE.Group[]) {
    clouds.forEach((cloud, i) => {
        cloud.position.x += 0.002 * (i % 2 === 0 ? 1 : 0.7)
        // 画面外に出たら反対側に戻す
        if (cloud.position.x > 10) {
            cloud.position.x = -10
        }
    })
}
