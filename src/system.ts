import { promises as fs } from 'node:fs';
import screenshot from 'screenshot-desktop';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { GetCursorPos } from './win32.js';

const execAsync = promisify(exec);

export const takeScreenshot = async (monitorId?: string): Promise<string> => {
    let img: Buffer;
    if (monitorId) {
        img = await screenshot({ screen: monitorId, format: 'png' });
    } else {
        img = await screenshot({ format: 'png' });
    }
    return img.toString('base64');
};

export const getMonitors = async () => {
    return await screenshot.listDisplays();
};

export const getCursorPos = (): { x: number, y: number } | null => {
    const point = { x: 0, y: 0 };
    const success = GetCursorPos(point);
    return success ? point : null;
};

export const getClipboard = async (): Promise<string> => {
    try {
        const { stdout } = await execAsync('powershell -command "Get-Clipboard"');
        return stdout.trim();
    } catch {
        return '';
    }
};

export const setClipboard = async (text: string): Promise<void> => {
    try {
        const escaped = text.replace(/"/g, '`"');
        await execAsync(`powershell -command "Set-Clipboard -Value \\"${escaped}\\""`);
    } catch (e) {
        console.error('Failed to set clipboard', e);
    }
};

export const fileExists = async (path: string): Promise<boolean> => {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
};

export const readFile = async (path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> => {
    return fs.readFile(path, { encoding });
};

export const writeFile = async (path: string, data: string): Promise<void> => {
    await fs.writeFile(path, data);
};

export const listDir = async (path: string): Promise<Array<{ name: string, isDirectory: boolean }>> => {
    const entries = await fs.readdir(path, { withFileTypes: true });
    return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }));
};
