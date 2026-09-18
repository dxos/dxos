//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, onTestFinished, test } from 'vitest';

import { buildErrnoShim, compileSharedObject, errnoShimSupported } from './errno-shim.ts';

/**
 * Preloaded constructor: a SIGUSR1 handler sets errno to EINTR; reports errno after raising it, and whether `sigaction`
 * reports that handler.
 */
const PROBE_SOURCE = `struct glibc_sigaction {
  void *handler;
  unsigned long mask[16];
  int flags;
  void (*restorer)(void);
};

extern int sigaction(int signal, const struct glibc_sigaction *action, struct glibc_sigaction *previous);
extern int raise(int signal);
extern int *__errno_location(void);
extern long write(int fd, const void *buffer, unsigned long count);

static void clobber(int signal) {
  (void)signal;
  *__errno_location() = 4;
}

__attribute__((constructor)) static void probe(void) {
  struct glibc_sigaction action = {0};
  action.handler = (void *)clobber;
  struct glibc_sigaction reported = {0};
  sigaction(10, &action, 0);
  sigaction(10, 0, &reported);
  *__errno_location() = 0;
  raise(10);
  int error = *__errno_location();
  char line[] = "errno=? handler=?\\n";
  line[6] = (char)('0' + (error >= 0 && error <= 9 ? error : 9));
  line[16] = reported.handler == (void *)clobber ? '1' : '0';
  write(2, line, sizeof line - 1);
}
`;

/** Preloaded constructor: restores through `sigaction` the handler glibc's `signal()` reported, then raises it. */
const RESTORE_PROBE_SOURCE = `struct glibc_sigaction {
  void *handler;
  unsigned long mask[16];
  int flags;
  void (*restorer)(void);
};
extern int sigaction(int signal, const struct glibc_sigaction *action, struct glibc_sigaction *previous);
extern void *signal(int number, void *handler);
extern int raise(int number);
extern int *__errno_location(void);
extern long write(int fd, const void *buffer, unsigned long count);
static int runs;
static void clobber(int number) { (void)number; runs++; *__errno_location() = 4; }
static void other(int number) { (void)number; }
__attribute__((constructor)) static void mix(void) {
  struct glibc_sigaction action = {0};
  action.handler = (void *)clobber;
  sigaction(10, &action, 0);
  void *reported = signal(10, (void *)other);
  struct glibc_sigaction restore = {0};
  restore.handler = reported;
  sigaction(10, &restore, 0);
  *__errno_location() = 0;
  raise(10);
  char line[] = "mixed errno=? runs=?\\n";
  int error = *__errno_location();
  line[12] = (char)('0' + (error >= 0 && error <= 9 ? error : 9));
  line[19] = (char)('0' + (runs <= 9 ? runs : 9));
  write(2, line, sizeof line - 1);
}
`;

const runProbe = (preload: string[]): string =>
  spawnSync('/bin/true', { env: { LD_PRELOAD: preload.join(':') }, encoding: 'utf8' }).stderr.trim();

describe.runIf(errnoShimSupported())('errno shim', () => {
  test('restores the errno a signal handler changed, and reports the handler the process installed', ({ expect }) => {
    const dir = mkdtempSync(join(tmpdir(), 'errno-shim-probe-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const probe = join(dir, 'probe.so');
    compileSharedObject(PROBE_SOURCE, probe);

    expect(runProbe([probe])).toBe('errno=4 handler=1');
    expect(runProbe([buildErrnoShim(dir), probe])).toBe('errno=0 handler=1');
  });

  test('a handler restored from what signal() reported runs once, with errno restored', ({ expect }) => {
    const dir = mkdtempSync(join(tmpdir(), 'errno-shim-probe-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const probe = join(dir, 'restore-probe.so');
    compileSharedObject(RESTORE_PROBE_SOURCE, probe);

    expect(runProbe([buildErrnoShim(dir), probe])).toBe('mixed errno=0 runs=1');
  });
});
