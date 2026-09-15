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

/** Preloaded destructor, run once the shim is initialized: writes to an unmapped address no compiler treats as null. */
const CRASH_PROBE_SOURCE = `__attribute__((destructor)) static void crash(void) {
  int *volatile pointer = (int *)16;
  *pointer = 1;
}
`;

/** Preloaded destructor, run once the shim is initialized: a breakpoint, which on x86_64 resumes after the trap. */
const TRAP_PROBE_SOURCE = `__attribute__((destructor)) static void crash(void) {
#if defined(__x86_64__)
  __asm__("int3");
#else
  __builtin_trap();
#endif
}
`;

/**
 * Preloaded destructor, run once the shim is initialized: a breakpoint whose report calls `abort()` from the
 * `backtrace` the shim resolves here.
 */
const NESTED_PROBE_SOURCE = `extern void abort(void);
static volatile int armed;
int backtrace(void **buffer, int size) {
  (void)buffer;
  (void)size;
  if (armed) {
    abort();
  }
  return 0;
}
__attribute__((destructor)) static void crash(void) {
  armed = 1;
#if defined(__x86_64__)
  __asm__("int3");
#else
  __builtin_trap();
#endif
}
`;

/**
 * Preloaded destructor, run once the shim is initialized: faults, and the `backtrace` the shim resolves here faults a
 * second thread with the same signal and returns once that thread reaches `pause()`.
 */
const THREAD_PROBE_SOURCE = `extern int pipe(int fds[2]);
extern long read(int fd, void *buffer, unsigned long count);
extern long write(int fd, const void *buffer, unsigned long count);
extern int pthread_create(unsigned long *thread, const void *attr, void *(*start)(void *), void *arg);
static int go[2];
static int waiting[2];
static volatile int armed;
static void *second(void *unused) {
  char byte;
  read(go[0], &byte, 1);
  int *volatile pointer = (int *)16;
  *pointer = 1;
  return unused;
}
int backtrace(void **buffer, int size) {
  (void)buffer;
  (void)size;
  if (armed) {
    char byte = 0;
    write(go[1], &byte, 1);
    read(waiting[0], &byte, 1);
    write(2, "second thread waited\\n", 21);
  }
  return 0;
}
int pause(void) {
  char byte = 0;
  write(waiting[1], &byte, 1);
  read(go[0], &byte, 1);
  return -1;
}
__attribute__((destructor)) static void crash(void) {
  unsigned long thread;
  pipe(go);
  pipe(waiting);
  pthread_create(&thread, 0, second, 0);
  armed = 1;
  int *volatile pointer = (int *)16;
  *pointer = 1;
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

  test('a crash no handler claims reports its signal, address and backtrace, then still kills the process', ({
    expect,
  }) => {
    const dir = mkdtempSync(join(tmpdir(), 'errno-shim-probe-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const probe = join(dir, 'crash-probe.so');
    compileSharedObject(CRASH_PROBE_SOURCE, probe);

    const result = spawnSync('/bin/true', {
      env: { LD_PRELOAD: [buildErrnoShim(dir), probe].join(':') },
      encoding: 'utf8',
    });
    expect(result.signal).toBe('SIGSEGV');
    expect(result.stderr).toMatch(/dx-crash-report pid=\d+ signal=11 code=\d+ addr=0x10\n/);
    expect(result.stderr).toContain('crash-probe.so(');
  });

  test('a breakpoint that resumes after the trap still ends the process', ({ expect }) => {
    const dir = mkdtempSync(join(tmpdir(), 'errno-shim-probe-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const probe = join(dir, 'trap-probe.so');
    compileSharedObject(TRAP_PROBE_SOURCE, probe);

    const result = spawnSync('/bin/true', {
      env: { LD_PRELOAD: [buildErrnoShim(dir), probe].join(':') },
      encoding: 'utf8',
    });
    expect(result.signal).toBe('SIGTRAP');
    expect(result.stderr).toMatch(/dx-crash-report pid=\d+ signal=5 /);
  });

  test('a crash signal raised while the report is written ends the process with that signal', ({ expect }) => {
    const dir = mkdtempSync(join(tmpdir(), 'errno-shim-probe-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const probe = join(dir, 'nested-probe.so');
    compileSharedObject(NESTED_PROBE_SOURCE, probe);

    const result = spawnSync('/bin/true', {
      env: { LD_PRELOAD: [buildErrnoShim(dir), probe].join(':') },
      encoding: 'utf8',
    });
    expect(result.signal).toBe('SIGABRT');
    expect(result.stderr).toMatch(/dx-crash-report pid=\d+ signal=5 /);
  });

  test('a second thread crashing with the same signal waits for the first report to finish', ({ expect }) => {
    const dir = mkdtempSync(join(tmpdir(), 'errno-shim-probe-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const probe = join(dir, 'thread-probe.so');
    compileSharedObject(THREAD_PROBE_SOURCE, probe);

    const result = spawnSync('/bin/true', {
      env: { LD_PRELOAD: [buildErrnoShim(dir), probe].join(':') },
      encoding: 'utf8',
    });
    expect(result.signal).toBe('SIGSEGV');
    expect(result.stderr).toMatch(/dx-crash-report pid=\d+ signal=11 code=\d+ addr=0x10\nsecond thread waited\n/);
  });
});
