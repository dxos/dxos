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
 * fails an errno-checked parse in progress there (ICE candidates, SDP ports, GLib `getauxval`). A crash signal no
 * handler claims prints `dx-crash-report` with the fault address and a native backtrace to stderr before the process
 * dies.
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

/* The handler the process installed for each signal, and whether it asked for siginfo. */
static void *volatile handlers[SIGNAL_COUNT];
static volatile int takes_siginfo[SIGNAL_COUNT];

/* Resolved at load, so a signal handler never has to call dlsym; a constructor that ran earlier resolves it lazily. */
__attribute__((constructor)) static void resolve_next_sigaction(void) {
  if (!next_sigaction) {
    next_sigaction = (sigaction_fn)dlsym(RTLD_NEXT_HANDLE, "sigaction");
  }
}

/* Crash signals the reporter below describes before the process dies. */
static const int crash_signals[] = {4, 5, 6, 7, 8, 11};

struct crash_siginfo {
  int signo;
  int error;
  int code;
  int pad;
  void *addr;
};

extern int backtrace(void **buffer, int size);
extern void backtrace_symbols_fd(void *const *buffer, int size, int fd);
extern long write(int fd, const void *buffer, unsigned long count);
extern int getpid(void);
extern int raise(int signal);
extern unsigned alarm(unsigned seconds);
extern int pause(void);
extern int gettid(void);

/* The thread writing the report; another crashing thread waits for the process to end instead. */
static volatile int reporting_thread;

static void write_text(const char *text) {
  unsigned long length = 0;
  while (text[length]) {
    length++;
  }
  write(2, text, length);
}

static void write_number(unsigned long value, unsigned base) {
  char digits[24];
  int index = sizeof digits;
  do {
    digits[--index] = "0123456789abcdef"[value % base];
    value /= base;
  } while (value && index > 0);
  write(2, digits + index, sizeof digits - index);
}

/* Prints the signal, fault address and native backtrace to stderr, then ends the process with that signal. */
static void report_crash(int signal, void *info, void *context) {
  (void)context;
  struct crash_siginfo *details = info;
  struct glibc_sigaction fallback = {0};
  int thread = gettid();
  if (!__sync_bool_compare_and_swap(&reporting_thread, 0, thread)) {
    /* A crash signal raised while this thread reports ends the process with that signal once the handler returns. */
    if (reporting_thread == thread) {
      next_sigaction(signal, &fallback, 0);
      raise(signal);
      return;
    }
    for (;;) {
      pause();
    }
  }
  /* An unwinder stuck on a lock another thread holds still ends the process. */
  next_sigaction(14, &fallback, 0);
  alarm(5);
  write_text("dx-crash-report pid=");
  write_number((unsigned long)getpid(), 10);
  write_text(" signal=");
  write_number((unsigned long)signal, 10);
  write_text(" code=");
  if (details->code < 0) {
    write_text("-");
  }
  write_number((unsigned long)(details->code < 0 ? -(long)details->code : details->code), 10);
  /* Only a fault the kernel attributes to an address (0 < code < SI_KERNEL) carries one. */
  if (details->code > 0 && details->code < 128) {
    write_text(" addr=0x");
    write_number((unsigned long)details->addr, 16);
  }
  write_text("\\n");
  void *frames[64];
  int count = backtrace(frames, 64);
  backtrace_symbols_fd(frames, count, 2);
  /* Defaulted only now, so another thread crashing with this signal waits; a repeat fault here is fatal regardless. */
  next_sigaction(signal, &fallback, 0);
  /* Pending until return, so a breakpoint that resumes after the trap still ends the process. */
  raise(signal);
}

/* Installed ahead of the process's own handlers, which report it as their previous handler and chain to it. */
__attribute__((constructor)) static void install_crash_reporter(void) {
  resolve_next_sigaction();
  void *frames[1];
  backtrace(frames, 1);
  for (unsigned index = 0; index < sizeof crash_signals / sizeof crash_signals[0]; index++) {
    struct glibc_sigaction current = {0};
    if (next_sigaction(crash_signals[index], 0, &current) != 0 || current.handler != (void *)0) {
      continue;
    }
    struct glibc_sigaction reporter = {0};
    reporter.handler = (void *)report_crash;
    reporter.flags = SA_SIGINFO_FLAG;
    next_sigaction(crash_signals[index], &reporter, 0);
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

/** Compiler arguments ahead of the output path, which the stdin source and {@link LINK_ARGS} follow. */
const COMPILE_ARGS = ['-shared', '-fPIC', '-O2', '-fasynchronous-unwind-tables', '-x', 'c', '-o'];
const LINK_ARGS = ['-ldl'];

const compiler = (): string => process.env.CC || 'cc';

export const compileSharedObject = (source: string, output: string): void => {
  execFileSync(compiler(), [...COMPILE_ARGS, output, '-', ...LINK_ARGS], {
    input: source,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
};
