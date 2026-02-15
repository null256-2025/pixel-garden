import * as THREE from "three"

/**
 * 島の下に広がる雲海
 * 白い楕円体をランダム配置してゆっくりドリフト
 */
export function createCloudSea(scene: THREE.Scene) {
    const group = new THREE.Group()

    const cloudMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        flatShading: true,
        transparent: true,
        opacity: 0.7,
    })

    interface CloudData {
        mesh: THREE.Mesh
        baseX: number
        baseY: number
        speed: number
    }

    const clouds: CloudData[] = []
    const cloudCount = 80

    for (let i = 0; i < cloudCount; i++) {
        const geo = new THREE.SphereGeometry(1, 5, 4)
        const mesh = new THREE.Mesh(geo, cloudMat.clone())

        const x = (Math.random() - 0.5) * 50
        // 雲海は島の底面(y≈-3.8)の下あたり、y=-4〜-7 に広がる
        const y = -5 + (Math.random() - 0.5) * 3
        const z = (Math.random() - 0.5) * 50

        mesh.position.set(x, y, z)
        mesh.scale.set(
            2.0 + Math.random() * 3.0,
            0.4 + Math.random() * 0.5,
            1.5 + Math.random() * 2.5
        )

        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.opacity = 0.5 + Math.random() * 0.35

        group.add(mesh)

        clouds.push({
            mesh,
            baseX: x,
            baseY: y,
            speed: 0.05 + Math.random() * 0.15,
        })
    }

    scene.add(group)

    return (time: number) => {
        clouds.forEach(({ mesh, baseX, baseY, speed }) => {
            // X方向にゆっくりドリフト
            mesh.position.x = baseX + Math.sin(time * speed) * 3
            // Y方向に微小な揺れ（累積しないように絶対値で指定）
            mesh.position.y = baseY + Math.sin(time * 0.3 + baseX * 0.1) * 0.2
        })
    }
}
