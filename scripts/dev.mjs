import { spawn } from 'node:child_process';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const pythonCommand = process.env.PYTHON || 'python3';
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

const processes = [
  {
    name: 'flask',
    command: pythonCommand,
    args: ['-m', 'flask', '--app', 'app', 'run', '--host', '127.0.0.1', '--port', '5000']
  },
  {
    name: 'vite',
    command: npmCommand,
    args: ['--prefix', 'frontend', 'run', 'dev', '--', '--host', '127.0.0.1'],
    env: { BACKEND_URL: backendUrl }
  }
];

let shuttingDown = false;
const children = processes.map(({ name, command, args, env }) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: 'inherit'
  });

  child.on('error', (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const exitCode = code ?? (signal ? 1 : 0);
    console.error(`[${name}] exited${signal ? ` from ${signal}` : ` with code ${exitCode}`}`);
    shutdown(exitCode);
  });

  return child;
});

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }

  setTimeout(() => process.exit(code), 500).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
