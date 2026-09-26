//
// Copyright 2026 DXOS.org
//

/**
 * Per-command resource limits, applied with `ulimit` inside the sandboxed shell so they bind the
 * command and everything it spawns. Unset means unlimited.
 */
export type ResourceLimits = {
  /** CPU time per process, in seconds; exceeding it delivers SIGXCPU, and SIGKILL a second later. */
  cpuSeconds?: number;
  /**
   * Writable memory per process, in MiB. Enforced as the data-segment limit (`RLIMIT_DATA`), which
   * Linux applies to every private writable mapping; the address-space limit would be the obvious
   * choice but kills V8 and JavaScriptCore at startup, which reserve gigabytes of address space
   * they never touch. macOS does not enforce `RLIMIT_DATA`, so this is Linux-only. Leave a JS
   * runtime at least 1 GiB: Node 24 does not start under 512 MiB.
   */
  memoryMiB?: number;
  /** Largest file a process may write, in MiB. */
  fileSizeMiB?: number;
};

/**
 * Shell lines that apply `limits` to the rest of the script. `platform` decides which limits the
 * kernel enforces; a limit it would silently ignore is left out rather than giving a false sense
 * of confinement.
 */
export const limitsPrelude = (limits: ResourceLimits, platform: NodeJS.Platform): string[] => {
  const lines: string[] = [];
  if (limits.cpuSeconds !== undefined) {
    // The soft limit sits below the hard one so the process gets SIGXCPU, which reads as the CPU
    // limit, before the kernel's SIGKILL, which reads as anything at all. Soft first: while it is
    // still unlimited, a finite hard limit below it is rejected.
    const seconds = Math.max(1, Math.ceil(limits.cpuSeconds));
    lines.push(`ulimit -S -t ${seconds}`, `ulimit -H -t ${seconds + 1}`);
  }
  if (limits.memoryMiB !== undefined && platform === 'linux') {
    lines.push(`ulimit -d ${Math.ceil(limits.memoryMiB * 1024)}`);
  }
  if (limits.fileSizeMiB !== undefined) {
    // `ulimit -f` counts 1024-byte blocks in bash.
    lines.push(`ulimit -f ${Math.ceil(limits.fileSizeMiB * 1024)}`);
  }
  return lines;
};
