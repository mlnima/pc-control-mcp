import { spawn } from 'node:child_process';

const mcp = spawn('node', ['build/index.js'], { stdio: ['pipe', 'pipe', 'inherit'] });

let output = '';

mcp.stdout.on('data', (d) => {
    output += d.toString();
    console.log('Received output length:', d.length);
    if (output.includes('tools')) {
        mcp.stdin.end();
    }
});

mcp.on('close', (code) => {
    console.log('Test completed with exit code:', code);
    if (output.includes('process_launch')) {
        console.log('SUCCESS: Tools are registered correctly.');
    } else {
        console.error('FAILED: Output did not contain expected tools.');
    }
});

const req = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {}
}) + '\n';

mcp.stdin.write(req);
