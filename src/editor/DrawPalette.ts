import { PathDrawer, ToolType } from './PathDrawer';

export class DrawPalette {
    private container: HTMLDivElement;
    private buttons: Map<ToolType, HTMLButtonElement> = new Map();

    constructor(private pathDrawer: PathDrawer) {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.bottom = '20px';
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.display = 'flex';
        this.container.style.gap = '10px';
        this.container.style.padding = '10px';
        this.container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        this.container.style.borderRadius = '8px';
        this.container.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        this.container.style.fontFamily = 'sans-serif';
        this.container.style.zIndex = '1000'; // Ensure it's above the canvas

        // Prevent pointer events from falling through to the canvas
        this.container.addEventListener('pointerdown', e => e.stopPropagation());
        this.container.addEventListener('pointermove', e => e.stopPropagation());
        this.container.addEventListener('pointerup', e => e.stopPropagation());
        this.container.addEventListener('contextmenu', e => e.stopPropagation());

        this.addToolButton('River', '💧 川');
        this.addToolButton('Path', '🛤️ 道');

        const divider = document.createElement('div');
        divider.style.width = '2px';
        divider.style.backgroundColor = '#ccc';
        divider.style.margin = '0 4px';
        this.container.appendChild(divider);

        const clearBtn = document.createElement('button');
        clearBtn.innerText = '🗑️ クリア';
        clearBtn.style.padding = '8px 12px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.style.borderRadius = '4px';
        clearBtn.style.border = '1px solid #fca5a5';
        clearBtn.style.backgroundColor = '#fef2f2';
        clearBtn.style.color = '#991b1b';
        clearBtn.onclick = () => {
            if (confirm('描画したものをすべてクリアしますか？')) {
                this.pathDrawer.clearAll();
            }
        };
        this.container.appendChild(clearBtn);

        document.body.appendChild(this.container);

        // Select the default tool
        this.selectTool(this.pathDrawer.getCurrentTool());
    }

    private addToolButton(tool: ToolType, label: string) {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.style.padding = '8px 12px';
        btn.style.border = '2px solid transparent';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = 'white';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '6px';
        btn.style.fontSize = '14px';

        btn.onclick = () => {
            this.pathDrawer.setTool(tool);
            this.selectTool(tool);
        };
        this.buttons.set(tool, btn);
        this.container.appendChild(btn);
    }

    private selectTool(selectedTool: ToolType) {
        this.buttons.forEach((btn, toolType) => {
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
