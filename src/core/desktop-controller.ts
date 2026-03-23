import { createHumanMousePath } from './human-mouse.js';
import type {
    DesktopAdapter,
    EmergencyStopKey,
    ForegroundWindowInfo,
    HumanMouseOptions,
    InputGuardPadding,
    InputGuardState,
    MouseButton,
    WindowBounds
} from './types.js';

const sleep = async (ms: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
};

const randomDelay = (min: number, max: number): number => {
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    return Math.round(low + Math.random() * (high - low));
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const normalizePadding = (padding?: InputGuardPadding): Required<InputGuardPadding> => ({
    top: Math.max(0, Math.round(padding?.top ?? 0)),
    right: Math.max(0, Math.round(padding?.right ?? 0)),
    bottom: Math.max(0, Math.round(padding?.bottom ?? 0)),
    left: Math.max(0, Math.round(padding?.left ?? 0))
});

export class DesktopController {
    private inputGuard: InputGuardState | null = null;
    private emergencyStopKey: EmergencyStopKey = 'esc';

    constructor(private readonly adapter: DesktopAdapter) {}

    get platform(): string {
        return this.adapter.platform;
    }

    private checkEmergencyStop(): void {
        if (this.adapter.isEmergencyStopPressed(this.emergencyStopKey)) {
            throw new Error('Emergency stop key pressed (Esc). Action aborted.');
        }
    }

    private getCursorOrThrow(): { x: number; y: number } {
        const cursor = this.adapter.getCursorPos();
        if (!cursor) {
            throw new Error('Unable to read cursor position.');
        }

        return cursor;
    }

    private getClampedTarget(currentX: number, currentY: number, dx: number, dy: number): { x: number; y: number } {
        const requestedX = currentX + dx;
        const requestedY = currentY + dy;

        if (!this.inputGuard) {
            return { x: requestedX, y: requestedY };
        }

        const minX = this.inputGuard.bounds.left;
        const maxX = this.inputGuard.bounds.right;
        const minY = this.inputGuard.bounds.top;
        const maxY = this.inputGuard.bounds.bottom;

        return {
            x: clamp(requestedX, minX, maxX),
            y: clamp(requestedY, minY, maxY)
        };
    }

    private getGuardBoundsFromWindow(rawBounds: WindowBounds, padding: Required<InputGuardPadding>): WindowBounds {
        const left = rawBounds.left + padding.left;
        const top = rawBounds.top + padding.top;
        const right = rawBounds.right - padding.right;
        const bottom = rawBounds.bottom - padding.bottom;

        if (left >= right || top >= bottom) {
            throw new Error('Guard padding collapses the guarded area. Reduce padding values.');
        }

        return { left, top, right, bottom };
    }

    launchProcess(command: string, args?: string[], cwd?: string): number | undefined {
        return this.adapter.launchProcess(command, args, cwd);
    }

    listProcesses() {
        return this.adapter.listProcesses();
    }

    killProcess(pid: number): boolean {
        return this.adapter.killProcess(pid);
    }

    listWindows() {
        return this.adapter.listWindows();
    }

    findWindow(titleRegex: string) {
        return this.adapter.findWindow(titleRegex);
    }

    focusWindow(titleRegex: string) {
        return this.adapter.focusWindow(titleRegex);
    }

    getWindowBounds(titleRegex: string) {
        return this.adapter.getWindowBounds(titleRegex);
    }

    getForegroundWindow(): Promise<ForegroundWindowInfo | null> {
        return this.adapter.getForegroundWindow();
    }

    async setInputGuardWindow(titleRegex: string, padding?: InputGuardPadding): Promise<InputGuardState> {
        const rawBounds = await this.adapter.getWindowBounds(titleRegex);
        if (!rawBounds) {
            throw new Error(`Could not resolve window bounds for titleRegex: ${titleRegex}`);
        }

        const normalizedPadding = normalizePadding(padding);
        const guardedBounds = this.getGuardBoundsFromWindow(rawBounds, normalizedPadding);
        this.inputGuard = {
            titleRegex,
            bounds: guardedBounds,
            padding: normalizedPadding
        };

        return this.inputGuard;
    }

    clearInputGuard(): void {
        this.inputGuard = null;
    }

    getInputGuard(): InputGuardState | null {
        return this.inputGuard;
    }

    setEmergencyStopKey(key: EmergencyStopKey): EmergencyStopKey {
        this.emergencyStopKey = key;
        return this.emergencyStopKey;
    }

    getEmergencyStopKey(): EmergencyStopKey {
        return this.emergencyStopKey;
    }

    mouseMoveDelta(dx: number, dy: number): void {
        this.checkEmergencyStop();
        const cursor = this.getCursorOrThrow();
        const clampedTarget = this.getClampedTarget(cursor.x, cursor.y, dx, dy);
        this.adapter.mouseMoveAbsolute(clampedTarget.x, clampedTarget.y);
    }

    mouseMoveToAbsolute(x: number, y: number): void {
        const cursor = this.getCursorOrThrow();
        this.mouseMoveDelta(x - cursor.x, y - cursor.y);
    }

    async mouseMoveHuman(dx: number, dy: number, options: HumanMouseOptions = {}): Promise<{ steps: number; movedDx: number; movedDy: number }> {
        this.checkEmergencyStop();
        const cursor = this.getCursorOrThrow();

        const clampedTarget = this.getClampedTarget(cursor.x, cursor.y, dx, dy);
        const effectiveDx = clampedTarget.x - cursor.x;
        const effectiveDy = clampedTarget.y - cursor.y;

        const steps = createHumanMousePath(effectiveDx, effectiveDy, options);
        for (const step of steps) {
            this.checkEmergencyStop();
            this.adapter.mouseMoveDelta(step.dx, step.dy);
            await sleep(step.delayMs);
        }

        return {
            steps: steps.length,
            movedDx: effectiveDx,
            movedDy: effectiveDy
        };
    }

    async mouseMoveHumanToAbsolute(x: number, y: number, options: HumanMouseOptions = {}): Promise<{ steps: number; movedDx: number; movedDy: number }> {
        const cursor = this.getCursorOrThrow();
        return this.mouseMoveHuman(x - cursor.x, y - cursor.y, options);
    }

    mouseDown(button: MouseButton): void {
        this.checkEmergencyStop();
        this.adapter.mouseDown(button);
    }

    mouseUp(button: MouseButton): void {
        this.checkEmergencyStop();
        this.adapter.mouseUp(button);
    }

    mouseClick(button: MouseButton): void {
        this.checkEmergencyStop();
        this.adapter.mouseClick(button);
    }

    async mouseClickHuman(button: MouseButton, preDelayMs = 40, postDelayMs = 65): Promise<void> {
        this.checkEmergencyStop();
        await sleep(randomDelay(Math.max(0, preDelayMs - 20), preDelayMs + 20));
        this.checkEmergencyStop();
        this.adapter.mouseDown(button);
        await sleep(randomDelay(22, 70));
        this.checkEmergencyStop();
        this.adapter.mouseUp(button);
        await sleep(randomDelay(Math.max(0, postDelayMs - 30), postDelayMs + 30));
    }

    async mouseDoubleClickHuman(button: MouseButton, preDelayMs = 40, interClickDelayMs = 90, postDelayMs = 65): Promise<void> {
        this.checkEmergencyStop();
        await sleep(randomDelay(Math.max(0, preDelayMs - 20), preDelayMs + 20));

        this.checkEmergencyStop();
        this.adapter.mouseDown(button);
        await sleep(randomDelay(22, 70));
        this.checkEmergencyStop();
        this.adapter.mouseUp(button);

        await sleep(randomDelay(Math.max(25, interClickDelayMs - 20), interClickDelayMs + 25));

        this.checkEmergencyStop();
        this.adapter.mouseDown(button);
        await sleep(randomDelay(22, 70));
        this.checkEmergencyStop();
        this.adapter.mouseUp(button);

        await sleep(randomDelay(Math.max(0, postDelayMs - 30), postDelayMs + 30));
    }

    mouseScroll(delta: number): void {
        this.checkEmergencyStop();
        this.adapter.mouseScroll(delta);
    }

    mouseDrag(dx: number, dy: number, button: MouseButton): void {
        this.checkEmergencyStop();
        this.adapter.mouseDown(button);
        this.mouseMoveDelta(dx, dy);
        this.adapter.mouseUp(button);
    }

    async mouseDragHuman(dx: number, dy: number, button: MouseButton, options: HumanMouseOptions = {}): Promise<{ steps: number; movedDx: number; movedDy: number }> {
        this.checkEmergencyStop();
        this.adapter.mouseDown(button);
        await sleep(randomDelay(30, 90));
        const result = await this.mouseMoveHuman(dx, dy, {
            ...options,
            jitter: options.jitter ?? 1.2
        });
        await sleep(randomDelay(15, 60));
        this.checkEmergencyStop();
        this.adapter.mouseUp(button);
        return result;
    }

    keyPressScan(key: number): void {
        this.checkEmergencyStop();
        this.adapter.keyPressScan(key);
    }

    typeText(text: string): void {
        this.checkEmergencyStop();
        this.adapter.typeText(text);
    }

    getCursorPos() {
        return this.adapter.getCursorPos();
    }

    takeScreenshot(monitorId?: string) {
        return this.adapter.takeScreenshot(monitorId);
    }

    getMonitors() {
        return this.adapter.getMonitors();
    }

    getClipboard() {
        return this.adapter.getClipboard();
    }

    setClipboard(text: string) {
        return this.adapter.setClipboard(text);
    }

    fileExists(path: string) {
        return this.adapter.fileExists(path);
    }

    readFile(path: string) {
        return this.adapter.readFile(path);
    }

    writeFile(path: string, data: string) {
        return this.adapter.writeFile(path, data);
    }

    listDir(path: string) {
        return this.adapter.listDir(path);
    }

    runCmd(command: string, requireConfirmation?: boolean) {
        return this.adapter.runCmd(command, requireConfirmation);
    }
}
