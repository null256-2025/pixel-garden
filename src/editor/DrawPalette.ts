import { PathDrawer, ToolType } from './PathDrawer';
import { TerrainSculptor } from './TerrainSculptor';
import { NaturePlacer, NatureToolType } from './NaturePlacer';
import { DestroyerTool } from './DestroyerTool';
import { CommandHistory } from './CommandHistory';

type Category = 'Terrain' | 'Decoration' | 'Nature';
export type ExtendedToolType = ToolType | 'Tree' | 'Seed' | 'Grass' | 'Rock' | 'Destroy';

export class DrawPalette {
    private container: HTMLDivElement;
    private categoryRow: HTMLDivElement;
    private toolsRow: HTMLDivElement;

    private categoryButtons: Map<Category, HTMLButtonElement> = new Map();
    private toolButtons: Map<ExtendedToolType, HTMLButtonElement> = new Map();

    private currentCategory: Category = 'Decoration';

    private toolsByCategory: Record<Category, { type: ExtendedToolType, label: string }[]> = {
        Terrain: [
            { type: 'Raise', label: '⛰️ 盛る' },
            { type: 'Lower', label: '🕳️ 削る' }
        ],
        Decoration: [
            { type: 'River', label: '💧 川' },
            { type: 'Path', label: '🛤️ 道' }
        ],
        Nature: [
            { type: 'Tree', label: '🌲 木' },
            { type: 'Seed', label: '🌱 種(花)' },
            { type: 'Grass', label: '🌿 草' },
            { type: 'Rock', label: '🪨 岩' },
            { type: 'Destroy', label: '🪓 オノ(破壊)' }
        ]
    };

    constructor(
        private pathDrawer: PathDrawer,
        private terrainSculptor: TerrainSculptor,
        private naturePlacer: NaturePlacer,
        private destroyerTool: DestroyerTool
    ) {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.bottom = '20px';
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '8px';
        this.container.style.padding = '12px';
        this.container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        this.container.style.borderRadius = '12px';
        this.container.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
        this.container.style.fontFamily = 'sans-serif';
        this.container.style.zIndex = '1000'; // Ensure it's above the canvas

        // Prevent pointer events from falling through to the canvas
        this.container.addEventListener('pointerdown', e => e.stopPropagation());
        this.container.addEventListener('pointermove', e => e.stopPropagation());
        this.container.addEventListener('pointerup', e => e.stopPropagation());
        this.container.addEventListener('contextmenu', e => e.stopPropagation());

        // Category Row
        this.categoryRow = document.createElement('div');
        this.categoryRow.style.display = 'flex';
        this.categoryRow.style.gap = '10px';
        this.categoryRow.style.justifyContent = 'center';
        this.categoryRow.style.borderBottom = '1px solid #ddd';
        this.categoryRow.style.paddingBottom = '8px';
        this.container.appendChild(this.categoryRow);

        // Tools Row
        this.toolsRow = document.createElement('div');
        this.toolsRow.style.display = 'flex';
        this.toolsRow.style.gap = '10px';
        this.toolsRow.style.justifyContent = 'center';
        this.container.appendChild(this.toolsRow);

        this.addCategoryButton('Terrain', '🌍 地形');
        this.addCategoryButton('Decoration', '🛤️ デコ');
        this.addCategoryButton('Nature', '🌿 自然');

        const undoBtn = document.createElement('button');
        undoBtn.innerText = '↩️ 一つ戻す (Undo)';
        undoBtn.style.padding = '8px 12px';
        undoBtn.style.cursor = 'pointer';
        undoBtn.style.borderRadius = '4px';
        undoBtn.style.border = '1px solid #9ca3af';
        undoBtn.style.backgroundColor = '#f3f4f6';
        undoBtn.style.color = '#374151';
        undoBtn.style.fontSize = '12px';
        undoBtn.style.marginLeft = '10px';
        undoBtn.onclick = () => {
            CommandHistory.undo();
        };
        this.categoryRow.appendChild(undoBtn);

        document.body.appendChild(this.container);

        // Add keyboard listener for Undo (Ctrl+Z)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                CommandHistory.undo();
            }
        });

        // Select the default category and tool
        this.selectCategory('Decoration');
        this.selectTool('River');
    }

    private addCategoryButton(category: Category, label: string) {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.style.padding = '6px 12px';
        btn.style.border = '2px solid transparent';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = 'transparent';
        btn.style.fontWeight = 'bold';
        btn.style.color = '#555';
        btn.style.fontSize = '14px';

        btn.onclick = () => {
            this.selectCategory(category);
        };
        this.categoryButtons.set(category, btn);
        this.categoryRow.appendChild(btn);
    }

    private selectCategory(selectedCategory: Category) {
        this.currentCategory = selectedCategory;

        this.categoryButtons.forEach((btn, category) => {
            if (category === selectedCategory) {
                btn.style.backgroundColor = '#e5e7eb';
                btn.style.color = '#111';
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = '#555';
            }
        });

        // Re-render tools for the selected category
        this.renderTools();
    }

    private renderTools() {
        this.toolsRow.innerHTML = ''; // Clear current tools
        this.toolButtons.clear();

        const tools = this.toolsByCategory[this.currentCategory];

        tools.forEach(t => {
            const btn = document.createElement('button');
            btn.innerHTML = t.label;
            btn.style.padding = '8px 16px';
            btn.style.border = '2px solid transparent';
            btn.style.borderRadius = '6px';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = 'white';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.gap = '6px';
            btn.style.fontSize = '14px';
            btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

            btn.onclick = () => {
                this.selectTool(t.type);
            };
            this.toolButtons.set(t.type, btn);
            this.toolsRow.appendChild(btn);
        });

        // Auto-select the first tool in the category
        if (tools.length > 0) {
            this.selectTool(tools[0].type);
        }
    }

    private selectTool(selectedTool: ExtendedToolType) {
        if (selectedTool === 'Raise' || selectedTool === 'Lower') {
            this.terrainSculptor.setTool(selectedTool);
            this.pathDrawer.setTool(null);
            this.naturePlacer.setTool(null);
            this.destroyerTool.detachEvents();
        } else if (selectedTool === 'River' || selectedTool === 'Path') {
            this.pathDrawer.setTool(selectedTool);
            this.terrainSculptor.setTool(null);
            this.naturePlacer.setTool(null);
            this.destroyerTool.detachEvents();
        } else if (selectedTool === 'Destroy') {
            this.pathDrawer.setTool(null);
            this.terrainSculptor.setTool(null);
            this.naturePlacer.setTool(null);
            this.destroyerTool.attachEvents();
        } else {
            // Nature tools
            this.pathDrawer.setTool(null);
            this.terrainSculptor.setTool(null);
            this.naturePlacer.setTool(selectedTool as NatureToolType);
            this.destroyerTool.detachEvents();
        }

        this.toolButtons.forEach((btn, toolType) => {
            if (toolType === selectedTool) {
                btn.style.borderColor = '#3b82f6';
                btn.style.backgroundColor = '#eff6ff';
            } else {
                btn.style.borderColor = 'transparent';
                btn.style.backgroundColor = 'white';
            }
        });
    }
}
