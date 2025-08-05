#!/usr/bin/env node
/**
 * run-and-clean.js
 *
 * Start a command in its own process-group, relay INT/TERM so Ctrl-C works,
 * then – after the main process exits – kill anything that’s still hanging
 * around in that group.
 *
 * Works on macOS, Linux, and Windows (where we fall back to `taskkill /T`).
 */

import { spawn, execSync } from 'child_process';
import os from 'os';

if (process.argv.length < 3) {
  console.error('Usage: run-and-clean <cmd> [args...]');
  process.exit(64); // EX_USAGE
}

const [cmd, ...cmdArgs] = process.argv.slice(2);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Launch the target command detached so it becomes the leader of a *new*
//    process-group (POSIX) / job object (Windows).  We inherit stdio so the
//    child prints exactly as if it were run directly.
// ─────────────────────────────────────────────────────────────────────────────
const child = spawn(cmd, cmdArgs, {
  detached: true,
  stdio: 'inherit',
});

// Positive PID for normal use; negative PGID for kill-everything (POSIX only)
const pgid = -child.pid;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Forward SIGINT / SIGTERM immediately so Ctrl-C behaves normally.
//    (On Windows, Node only delivers SIGINT via ^C; we ignore SIGTERM.)
// ─────────────────────────────────────────────────────────────────────────────
['SIGINT', 'SIGTERM'].forEach((sig) => {
  // Windows can’t send SIGTERM; ignore or emulate if needed
  if (sig === 'SIGTERM' && os.platform() === 'win32') return;
  process.on(sig, () => {
    try {
      os.platform() === 'win32'
        ? execSync(`taskkill /PID ${child.pid} /T`) // gentle first
        : process.kill(pgid, sig);
    } catch (_) {
      /* already gone */
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. When the main process ends, reap the stragglers.
// ─────────────────────────────────────────────────────────────────────────────
child.on('exit', (code, signal) => {
  cleanup().then(() => {
    // Propagate the *same* exit status as the main command
    if (signal) {
      // Re-raise the same signal so shells see it (posix behaviour)
      process.kill(process.pid, signal);
    } else {
      process.exit(code);
    }
  });
});

async function cleanup() {
  // First, try a graceful TERM → wait 2 s → then go nuclear with KILL/F.
  try {
    if (os.platform() === 'win32') {
      execSync(`taskkill /PID ${child.pid} /T`); // graceful
      await pause(2000);
      execSync(`taskkill /F /PID ${child.pid} /T`); // force
    } else {
      process.kill(pgid, 'SIGTERM');
      await pause(2000);
      process.kill(pgid, 'SIGKILL');
    }
  } catch (_) {
    /* processes may already be gone */
  }
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
