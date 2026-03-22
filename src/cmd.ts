import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const DANGEROUS_VERBS = [
    'rm', 'del', 'format', 'diskpart', 'wget', 'curl', 'invoke-webrequest'
];

export const runCmd = async (command: string, requireConfirmation: boolean = true): Promise<string> => {
    const lowerCmd = command.toLowerCase();
    const isDangerous = DANGEROUS_VERBS.some(verb => lowerCmd.includes(verb));

    if (isDangerous && requireConfirmation) {
        throw new Error(`Command "${command}" contains blocked or dangerous verbs. Request user confirmation.`);
    }

    try {
        const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
        if (stderr) {
            return `Output:\n${stdout}\nErrors:\n${stderr}`;
        }
        return stdout;
    } catch (e: any) {
        return `Execution Failed: ${e.message}\nStdout: ${e.stdout}\nStderr: ${e.stderr}`;
    }
};
