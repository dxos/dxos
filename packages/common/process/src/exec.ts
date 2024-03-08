//
// Copyright 2023 DXOS.org
//

import { spawn } from 'node:child_process';

export type ExecOptions = {
  verbose: boolean;
  cwd: string;
  shell: boolean;
};

// TODO(zhenyasav): resolve with executors/.../exec.ts
export const exec = (command: string, options?: Partial<ExecOptions>): Promise<string> => {
  const { verbose, cwd, shell } = { verbose: false, cwd: process.cwd(), shell: true, ...options };
  if (verbose) {
    // eslint-disable-next-line no-console
    console.log(command);
  }

  const [first, ...rest] = command.split(' ');
  return new Promise((resolve, reject) => {
    const subprocess = spawn(first, rest, {
      shell,
      cwd,
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    subprocess.stdout.on('data', (chunk) => {
      stdout.push(chunk.toString('utf8'));
    });
    subprocess.stderr.on('data', (chunk) => {
      stderr.push(chunk.toString('utf8'));
    });
    subprocess.on('exit', (code) => {
      if (code === 0) {
        resolve(stdout.join());
      } else {
        reject(new Error(`exit code: ${code} ${stderr.join()} ${stdout.join()}`));
      }
    });
    subprocess.on('error', (error) => {
      reject(error);
    });
  });
};
