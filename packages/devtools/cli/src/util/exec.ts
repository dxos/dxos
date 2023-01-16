//
// Copyright 2023 DXOS.org
//

import { spawn } from 'node:child_process';

export type ExecOptions = {
  verbose: boolean;
  cwd: string;
};

export const exec = (command: string, options?: Partial<ExecOptions>): Promise<string> => {
  const { verbose, cwd } = { verbose: false, cwd: process.cwd(), ...options };
  if (verbose) {
    console.log(command);
  }
  const [first, ...rest] = command.split(' ');
  return new Promise((resolve, reject) => {
    const subprocess = spawn(first, rest, {
      shell: true,
      cwd
    });
    const stdout = Buffer.from([]);
    const stderr = Buffer.from([]);
    subprocess.stdout.on('data', (chunk) => {
      stdout.write(chunk.toString());
    });
    subprocess.stderr.on('data', (chunk) => {
      stderr.write(chunk.toString());
    });
    subprocess.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.toString());
      } else {
        reject(stderr.length ? stderr.toString() : stdout.length ? stdout.toString() : (code ?? '').toString());
      }
    });
    subprocess.on('error', (error) => {
      reject(error);
    });
  });
};
