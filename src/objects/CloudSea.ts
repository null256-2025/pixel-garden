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
        speed: number
    }

    const clouds: CloudData[] = []
    const cloudCount = 60

    for (let i = 0; i < cloudCount; i++) {
        const geo = new THREE.SphereGeometry(1, 5, 4)
        const mesh = new THREE.Mesh(geo, cloudMat.clone())

        const x = (Math.random() - 0.5) * 40
        const y = -2 + (Math.random() - 0.5) * 2.5
        const z = (Math.random() - 0.5) * 40

        mesh.position.set(x, y, z)
        mesh.scale.set(
            1.5 + Math.random() * 2.5,
            0.3 + Math.random() * 0.4,
            1.0 + Math.random() * 1.5
        )

        // ランダムな不透明度
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.opacity = 0.4 + Math.random() * 0.4

        mesh.receiveShadow = true
        group.add(mesh)

        clouds.push({
            mesh,
            baseX: x,
            speed: 0.1 + Math.random() * 0.2,
        })
    }

    scene.add(group)

    return (time: number) => {
        clouds.forEach(({ mesh, baseX, speed }) => {
            // X方向にゆっくりドリフト
            mesh.position.x = baseX + Math.sin(time * speed) * 2
            // Y方向に微小な揺れ
            mesh.position.y += Math.sin(time * 0.3 + mesh.position.z) * 0.001
        })
    }
}
