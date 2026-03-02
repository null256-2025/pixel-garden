import * as THREE from 'three';

export interface NeonFlickerConfig {
    /** 
     * Type of the neon:
     * - 'buggy': 普段はついているが、たまに「パチパチパチッ」と激しく明滅して消えかける。虫の息のような蛍光灯。
     * - 'broken': 完全に壊れかけていて、基本消えているが一瞬だけ「チカッ」とつく。
     * - 'glitch': チカチカとノイズのように明滅するが、頻度はそれほど高くない。
     */
    type: 'buggy' | 'broken' | 'glitch';
    /** The base intensity when fully on */
    baseIntensity: number;
    /** The scale of time for the flicker (speed) */
    timeScale?: number;
    /** Random offset to avoid synchronized flickering among shared materials */
    timeOffset?: number;
}

interface ManagedNeon {
    material: THREE.MeshPhongMaterial | THREE.MeshStandardMaterial;
    config: NeonFlickerConfig;
}

export class NeonManager {
    private neons: ManagedNeon[] = [];

    /**
     * Registers a material to be managed by the NeonManager.
     * Note: If the material is shared among many objects, all those objects will flicker synchronously.
     * Passing `clone: true` will clone the material before registering it.
     */
    public register(
        material: THREE.MeshPhongMaterial | THREE.MeshStandardMaterial,
        config: NeonFlickerConfig,
        clone: boolean = false
    ): THREE.MeshPhongMaterial | THREE.MeshStandardMaterial {
        const mat = clone ? material.clone() : material;

        // Add default parameters if missing
        if (config.timeScale === undefined) config.timeScale = 1.0;
        if (config.timeOffset === undefined) config.timeOffset = Math.random() * 1000;

        this.neons.push({ material: mat, config });
        return mat;
    }

    /**
     * Updates the emissive intensity of all registered neon materials.
     * @param time The total elapsed time in seconds.
     * @param dt The delta time since the last frame.
     */
    public update(time: number, dt: number) {
        for (const neon of this.neons) {
            const { material, config } = neon;
            const t = (time + config.timeOffset!) * config.timeScale!;

            let intensity = config.baseIntensity;

            switch (config.type) {
                case 'buggy':
                    // 普段はついているが、たまにパチパチッと消えかかる（蛍光灯の寿命）
                    if (Math.sin(t * 0.5) > 0.95) { // 稀に発生する不安定な期間
                        // 不安定な期間中は激しく明滅
                        const noise = Math.sin(t * 50) * Math.sin(t * 30 + 1) * Math.sin(t * 10);
                        if (noise > 0.5) {
                            intensity = 0; // 一瞬消える
                        } else if (noise > 0) {
                            intensity = config.baseIntensity * 0.3; // 暗くなる
                        }
                    } else if (Math.random() < 0.01) {
                        // 通常時でも1%の確率で一瞬だけチカッと暗くなる
                        intensity = config.baseIntensity * 0.5;
                    }
                    break;
                case 'broken':
                    // 基本消えているが、たまに一瞬だけチカッと点灯する（あるいは明かりが消え切った窓用）
                    if (Math.sin(t * 2) > 0.98 && Math.random() > 0.5) {
                        intensity = config.baseIntensity; // 一瞬だけ最大輝度
                    } else {
                        intensity = 0; // 基本は消灯
                    }
                    break;
                case 'glitch':
                    // ネオン看板用：たまにチカチカするが、頻度は落とす
                    if (Math.sin(t * 0.3) > 0.9) { // ゆっくりした周期でたまにグリッチ期間に入る
                        const noise = Math.sin(t * 15) * Math.sin(t * 25 + 2);
                        if (noise > 0.6) {
                            intensity = 0;
                        } else if (noise > 0.3) {
                            intensity = config.baseIntensity * 0.5;
                        }
                    }
                    break;
            }

            material.emissiveIntensity = intensity;
        }
    }

    /**
     * Clears all registered materials (useful when clearing the scene).
     */
    public clear() {
        this.neons = [];
    }
}
