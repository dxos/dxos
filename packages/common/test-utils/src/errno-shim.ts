//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Shared object preloaded into Linux WebKit that restores errno around every signal handler installed with `sigaction`:
 * WebKit's thread-suspend handler returns from `sigsuspend` with errno set to EINTR on the thread it interrupted, which
 * fails an errno-checked parse in progress there (ICE candidates, SDP ports, GLib `getauxval`).
 * Freestanding, for glibc on x86_64 and aarch64, whose `struct sigaction` share this layout.
 *
 * Delete this file once Playwright ships a WebKit that restores errno itself — see `webkit-workarounds.md`.
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

/* The handler the process installed for each signal, and whether it asked for siginfo. */
static void *volatile handlers[SIGNAL_COUNT];
static volatile int takes_siginfo[SIGNAL_COUNT];

/* Resolved at load, so a signal handler never has to call dlsym; a constructor that ran earlier resolves it lazily. */
__attribute__((constructor)) static void resolve_next_sigaction(void) {
  if (!next_sigaction) {
    next_sigaction = (sigaction_fn)dlsym(RTLD_NEXT_HANDLE, "sigaction");
  }
}

/* Passes all three arguments, which a one-argument handler ignores on x86_64 and aarch64. */
static void trampoline(int signal, void *info, void *context) {
  int *error = __errno_location();
  int saved = *error;
  ((void (*)(int, void *, void *))handlers[signal])(signal, info, context);
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
  resolve_next_sigaction();
  if (signal <= 0 || signal >= SIGNAL_COUNT) {
    return next_sigaction(signal, action, previous);
  }

  void *old_handler = handlers[signal];
  int old_siginfo = takes_siginfo[signal];
  /* A trampoline read back through glibc's internal sigaction, as signal() returns it, keeps the recorded handler. */
  if (action && action->handler == (void *)trampoline) {
    struct glibc_sigaction restored = *action;
    restored.flags |= SA_SIGINFO_FLAG;
    int result = next_sigaction(signal, &restored, previous);
    if (result == 0) {
      unwrap(previous, old_handler, old_siginfo);
    }
    return result;
  }
  if (!action || action->handler == (void *)0 || action->handler == (void *)1) {
    int result = next_sigaction(signal, action, previous);
    if (result == 0) {
      unwrap(previous, old_handler, old_siginfo);
    }
    return result;
  }

  handlers[signal] = action->handler;
  takes_siginfo[signal] = action->flags & SA_SIGINFO_FLAG;
  struct glibc_sigaction wrapped = *action;
  wrapped.handler = (void *)trampoline;
  wrapped.flags |= SA_SIGINFO_FLAG;
  int result = next_sigaction(signal, &wrapped, previous);
  if (result != 0) {
    handlers[signal] = old_handler;
    takes_siginfo[signal] = old_siginfo;
    return result;
  }
  unwrap(previous, old_handler, old_siginfo);
  return result;
}
`;

/** Whether {@link ERRNO_SHIM_SOURCE} fits this process's platform and architecture. */
export const errnoShimSupported = (): boolean =>
  process.platform === 'linux' && (process.arch === 'x64' || process.arch === 'arm64');

/**
 * Compiles {@link ERRNO_SHIM_SOURCE} into `cacheDir` once per source, compiler invocation and architecture,
 * and returns its path.
 */
export const buildErrnoShim = (cacheDir: string): string => {
  const hash = createHash('sha256')
    .update(JSON.stringify([ERRNO_SHIM_SOURCE, compiler(), COMPILE_ARGS, LINK_ARGS]))
    .digest('hex')
    .slice(0, 16);
  const output = join(cacheDir, `errno-shim-${process.arch}-${hash}.so`);
  if (existsSync(output)) {
    return output;
  }

  mkdirSync(cacheDir, { recursive: true });
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

const COMPILE_ARGS = ['-shared', '-fPIC', '-O2', '-x', 'c', '-o'];
const LINK_ARGS = ['-ldl'];

const compiler = (): string => process.env.CC || 'cc';

export const compileSharedObject = (source: string, output: string): void => {
  execFileSync(compiler(), [...COMPILE_ARGS, output, '-', ...LINK_ARGS], {
    input: source,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
};
