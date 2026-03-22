import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const launchProcess = (command: string, args: string[] = [], cwd?: string): number | undefined => {
    const proc = spawn(command, args, {
        cwd,
        detached: true,
        stdio: 'ignore',
        windowsHide: false
    });
    proc.unref();
    return proc.pid;
};

export const listProcesses = async (): Promise<Array<{ name: string; pid: number; session: string; memory: string }>> => {
    try {
        const { stdout } = await execAsync('tasklist /fo csv /nh');
        const lines = stdout.trim().split('\n').filter(Boolean);
        return lines.map((line) => {
            const match = line.match(/"([^"]*)"/g);
            if (!match) {
                return null;
            }

            const cols = match.map((column) => column.replace(/(^"|"$)/g, ''));
            return {
                name: cols[0],
                pid: parseInt(cols[1], 10),
                session: cols[2],
                memory: cols[4]
            };
        }).filter((entry): entry is { name: string; pid: number; session: string; memory: string } => Boolean(entry));
    } catch {
        return [];
    }
};

export const killProcess = (pid: number): boolean => {
    if (!Number.isFinite(pid) || pid <= 0) {
        return false;
    }

    try {
        spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
            detached: true
        }).unref();
        return true;
    } catch {
        return false;
    }
};
