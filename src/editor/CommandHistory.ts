export class CommandHistory {
    private static stack: Array<() => void> = [];

    public static push(undoFn: () => void) {
        this.stack.push(undoFn);
        if (this.stack.length > 50) this.stack.shift(); // Keep maximum 50 undo actions
    }

    public static undo() {
        const fn = this.stack.pop();
        if (fn) fn();
    }
}
