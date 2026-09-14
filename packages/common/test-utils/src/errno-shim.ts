//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Shared object preloaded into Linux WebKit that restores errno around every signal handler installed with `sigaction`:
 * WebKit's thread-suspend handler returns from `sigsuspend` with errno set to EINTR on the thread it interrupted, which
 * fails an errno-checked parse in progress there (ICE candidates, SDP ports, GLib `getauxval`).
 * Freestanding, for glibc on x86_64 and aarch64, whose `struct sigaction` share this layout.
 */
export const ERRNO_SHIM_SOURCE = `#define SA_SIGINFO_FLAG 4
#define SIGNAL_COUNT 65
#define RTLD_NEXT_HANDLE ((void *)-1L)

struct glibc_sigaction {
  void *handler;
  unsigned long mask[16];
  int flags;
  void (*restorer)(void);
};

typedef int (*sigaction_fn)(int, const struct glibc_sigaction *, struct glibc_sigaction *);

extern void *dlsym(void *handle, const char *name);
extern int *__errno_location(void);

static sigaction_fn next_sigaction;

/* The handler the process installed for each signal, and whether it takes siginfo. */
static void *volatile handlers[SIGNAL_COUNT];
static volatile int takes_siginfo[SIGNAL_COUNT];

static void trampoline(int signal, void *info, void *context) {
  int *error = __errno_location();
  int saved = *error;
  void *handler = handlers[signal];
  if (takes_siginfo[signal]) {
    ((void (*)(int, void *, void *))handler)(signal, info, context);
  } else {
    ((void (*)(int))handler)(signal);
  }
  *error = saved;
}

/* Reports the process's own handler where the kernel holds the trampoline. */
static void unwrap(struct glibc_sigaction *action, void *handler, int siginfo) {
  if (action && action->handler == (void *)trampoline) {
    action->handler = handler;
    action->flags = (action->flags & ~SA_SIGINFO_FLAG) | siginfo;
  }
}

int sigaction(int signal, const struct glibc_sigaction *action, struct glibc_sigaction *previous) {
  if (!next_sigaction) {
    next_sigaction = (sigaction_fn)dlsym(RTLD_NEXT_HANDLE, "sigaction");
  }
  if (signal <= 0 || signal >= SIGNAL_COUNT) {
    return next_sigaction(signal, action, previous);
  }

  void *old_handler = handlers[signal];
  int old_siginfo = takes_siginfo[signal];
  if (!action || action->handler == (void *)0 || action->handler == (void *)1) {
    int result = next_sigaction(signal, action, previous);
    if (result == 0) {
      unwrap(previous, old_handler, old_siginfo);
    }
    return result;
  }

  /* A handler is only ever called with at least the arguments it takes, including mid-update. */
  int siginfo = action->flags & SA_SIGINFO_FLAG;
  takes_siginfo[signal] = SA_SIGINFO_FLAG;
  handlers[signal] = action->handler;
  takes_siginfo[signal] = siginfo;

  struct glibc_sigaction wrapped = *action;
  wrapped.handler = (void *)trampoline;
  wrapped.flags |= SA_SIGINFO_FLAG;
  int result = next_sigaction(signal, &wrapped, previous);
  if (result != 0) {
    takes_siginfo[signal] = SA_SIGINFO_FLAG;
    handlers[signal] = old_handler;
    takes_siginfo[signal] = old_siginfo;
    return result;
  }
  unwrap(previous, old_handler, old_siginfo);
  return result;
}
`;

/** Compiles {@link ERRNO_SHIM_SOURCE} once per source and architecture and returns the shared object's path. */
export const buildErrnoShim = (): string => {
  const hash = createHash('sha256').update(ERRNO_SHIM_SOURCE).digest('hex').slice(0, 16);
  const dir = join(tmpdir(), 'dxos-test-utils');
  const output = join(dir, `errno-shim-${process.arch}-${hash}.so`);
  if (existsSync(output)) {
    return output;
  }

  mkdirSync(dir, { recursive: true });
  // Renamed into place, so a concurrent Playwright worker never preloads a partly written file.
  const partial = `${output}.${process.pid}`;
  try {
    compileSharedObject(ERRNO_SHIM_SOURCE, partial);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Linux WebKit e2e needs a C compiler (\`cc\`, or \`CC\`) to build its errno shim: ${detail}`);
  }
  renameSync(partial, output);
  return output;
};

export const compileSharedObject = (source: string, output: string): void => {
  execFileSync(process.env.CC || 'cc', ['-shared', '-fPIC', '-O2', '-x', 'c', '-o', output, '-'], {
    input: source,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
};
