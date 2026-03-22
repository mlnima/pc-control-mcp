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

export const listProcesses = async (): Promise<any[]> => {
    try {
        const { stdout } = await execAsync('tasklist /fo csv /nh');
        const lines = stdout.trim().split('\n');
        return lines.map(line => {
            const match = line.match(/"([^"]*)"/g);
            if (!match) return null;
            const cols = match.map(c => c.replace(/(^"|"$)/g, ''));
            return {
                name: cols[0],
                pid: parseInt(cols[1], 10),
                session: cols[2],
                memory: cols[4]
            };
        }).filter(Boolean);
    } catch (e) {
        return [];
    }
};

export const killProcess = (pid: number): boolean => {
    try {
        process.kill(pid, 'SIGTERM');
        return true;
    } catch {
        try {
            process.kill(pid, 'SIGKILL');
            return true;
        } catch {
            return false;
        }
    }
};
