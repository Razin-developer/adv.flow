import { spawnSync } from 'child_process';
import os from 'os';
import path from 'path';

const isWin = os.platform() === 'win32';
const scriptPath = path.join('src-tauri', 'scripts', 'build-cli-sidecar.ps1');

function run(cmd) {
    console.log(`Running: ${cmd} -File ${scriptPath}`);
    return spawnSync(cmd, ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], { stdio: 'inherit', shell: true });
}

let result = run(isWin ? 'powershell' : 'pwsh');

if (result.status !== 0 && isWin) {
    console.log('Powershell failed, trying pwsh...');
    result = run('pwsh');
}

if (result.status !== 0) {
    console.error('Sidecar build failed.');
    process.exit(result.status || 1);
}
