import { PathDrawer, ToolType } from './PathDrawer';
import { TerrainSculptor } from './TerrainSculptor';
import { NaturePlacer, CityToolType } from './NaturePlacer';
import { DestroyerTool } from './DestroyerTool';
import { CommandHistory } from './CommandHistory';

type Category = 'Terrain' | 'Decoration' | 'City';
export type ExtendedToolType = ToolType | CityToolType | 'Demolish';

export class DrawPalette {
    private container: HTMLDivElement;
    private categoryRow: HTMLDivElement;
    private toolsRow: HTMLDivElement;

    private categoryButtons: Map<Category, HTMLButtonElement> = new Map();
    private toolButtons: Map<ExtendedToolType, HTMLButtonElement> = new Map();

    private currentCategory: Category = 'Decoration';

    // Updated labels to be just emojis, and added 'title' for tooltips
    private toolsByCategory: Record<Category, { type: ExtendedToolType, label: string, title: string }[]> = {
        Terrain: [
            { type: 'Raise', label: '⛰️', title: '盛る' },
            { type: 'Lower', label: '🕳️', title: '削る' }
        ],
        Decoration: [
            { type: 'Road', label: '🛣️', title: '道路' },
            { type: 'Crosswalk', label: '🦓', title: '横断歩道' }
        ],
        City: [
            { type: 'StreetLight', label: '🏮', title: '街灯' },
            { type: 'NeonSign', label: '💡', title: 'ネオン表示' },
            { type: 'TallTower', label: '🏢', title: '大型タワー' },
            { type: 'SlimTower', label: '🗼', title: 'スリムタワー' },
            { type: 'WideLow', label: '🏭', title: '低層ワイド' },
            { type: 'MediumA', label: '🏬', title: '中層ビルA' },
            { type: 'MediumB', label: '🏨', title: '中層ビルB' },
            { type: 'ShopFront', label: '🏪', title: '店舗入口' },
            { type: 'OfficeBlock', label: '🏦', title: 'オフィス' },
            { type: 'Apartment', label: '🏘️', title: 'アパート' },  // changed from 🏢 to avoid duplicate with TallTower
            { type: 'MiniBox', label: '📦', title: 'ミニ店舗' },
            { type: 'CornerBldg', label: '📐', title: '角地ビル' },
            { type: 'Demolish', label: '🔨', title: '破壊' }
        ]
    };

    private isCollapsed = false;
    private toggleBtn: HTMLButtonElement;

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
        this.container.style.backgroundColor = 'rgba(15, 15, 30, 0.92)';
        this.container.style.borderRadius = '12px';
        this.container.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(100, 0, 255, 0.15)';
        this.container.style.fontFamily = 'sans-serif';
        this.container.style.transition = 'bottom 0.3s ease';
        this.container.style.zIndex = '1000';
        this.container.style.border = '1px solid rgba(100, 100, 200, 0.2)';

        // Toggle Button at the top right of the palette
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.innerText = '▼';
        this.toggleBtn.style.position = 'absolute';
        this.toggleBtn.style.top = '-20px';
        this.toggleBtn.style.right = '10px';
        this.toggleBtn.style.padding = '2px 10px';
        this.toggleBtn.style.backgroundColor = 'rgba(15, 15, 30, 0.92)';
        this.toggleBtn.style.border = '1px solid rgba(100, 100, 200, 0.2)';
        this.toggleBtn.style.borderBottom = 'none';
        this.toggleBtn.style.borderRadius = '6px 6px 0 0';
        this.toggleBtn.style.color = '#aab';
        this.toggleBtn.style.cursor = 'pointer';
        this.toggleBtn.onclick = () => this.toggleCollapse();
        this.container.appendChild(this.toggleBtn);

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
        this.categoryRow.style.borderBottom = '1px solid rgba(100, 100, 200, 0.2)';
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
        this.addCategoryButton('City', '🏙️ 都市');

        const undoBtn = document.createElement('button');
        undoBtn.innerText = '↩️ 一つ戻す (Undo)';
        undoBtn.style.padding = '8px 12px';
        undoBtn.style.cursor = 'pointer';
        undoBtn.style.borderRadius = '4px';
        undoBtn.style.border = '1px solid rgba(100, 100, 200, 0.3)';
        undoBtn.style.backgroundColor = 'rgba(30, 30, 50, 0.8)';
        undoBtn.style.color = '#aab';
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
        this.selectCategory('City');
        this.selectTool('TallTower');
    }

    private toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        if (this.isCollapsed) {
            // Hide rows and button says ▲
            this.categoryRow.style.display = 'none';
            this.toolsRow.style.display = 'none';
            this.toggleBtn.innerText = '▲';
            this.container.style.padding = '0';
            this.container.style.border = 'none';
            this.container.style.boxShadow = 'none';
            this.container.style.backgroundColor = 'transparent';
        } else {
            // Show rows and button says ▼
            this.categoryRow.style.display = 'flex';
            this.toolsRow.style.display = 'flex';
            this.toggleBtn.innerText = '▼';
            this.container.style.padding = '12px';
            this.container.style.border = '1px solid rgba(100, 100, 200, 0.2)';
            this.container.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(100, 0, 255, 0.15)';
            this.container.style.backgroundColor = 'rgba(15, 15, 30, 0.92)';
        }
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
        btn.style.color = '#8888aa';
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
                btn.style.backgroundColor = 'rgba(80, 80, 150, 0.3)';
                btn.style.color = '#ccccff';
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = '#8888aa';
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
            btn.title = t.title; // Add tooltip on hover
            btn.style.width = '40px';
            btn.style.height = '40px';
            btn.style.border = '2px solid transparent';
            btn.style.borderRadius = '6px';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = 'rgba(25, 25, 45, 0.8)';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.fontSize = '20px'; // Increase emoji size
            btn.style.color = '#aab';
            btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

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
        } else if (selectedTool === 'Path' || selectedTool === 'Road' || selectedTool === 'Crosswalk') {
            this.pathDrawer.setTool(selectedTool);
            this.terrainSculptor.setTool(null);
            this.naturePlacer.setTool(null);
            this.destroyerTool.detachEvents();
        } else if (selectedTool === 'Demolish') {
            this.pathDrawer.setTool(null);
            this.terrainSculptor.setTool(null);
            this.naturePlacer.setTool(null);
            this.destroyerTool.attachEvents();
        } else {
            // City tools (StreetLight, NeonSign)
            this.pathDrawer.setTool(null);
            this.terrainSculptor.setTool(null);
            this.naturePlacer.setTool(selectedTool as CityToolType);
            this.destroyerTool.detachEvents();
        }

        this.toolButtons.forEach((btn, toolType) => {
            if (toolType === selectedTool) {
                btn.style.borderColor = '#6644ff';
                btn.style.backgroundColor = 'rgba(60, 40, 150, 0.3)';
            } else {
                btn.style.borderColor = 'transparent';
                btn.style.backgroundColor = 'rgba(25, 25, 45, 0.8)';
            }
        });
    }
}
