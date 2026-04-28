//
// Copyright 2026 DXOS.org
//

/**
 * Background `warnAfterTimeout` chatter that we don't want bleeding into
 * normal CLI output. The pattern matches a stable prefix only — a future
 * rewording of the message past "more" (e.g. "than" → "then" typo fix)
 * won't silently break suppression.
 *
 * Source of these warnings: `warnAfterTimeout` in @dxos/debug, fired e.g.
 * during eager space initialisation in ClientPlugin when there's prior
 * data on disk that takes >5s to load.
 */
const TIMEOUT_WARNING_PREFIX_RE = /^Action `[^`]+` is taking more/;

/**
 * Pure state machine that decides whether a stderr chunk should be dropped.
 * Exposed for testing — the in-process `installStderrFilter()` wraps this.
 *
 * State semantics:
 *  - `suppressing=false`: drop the chunk iff it starts with a timeout
 *    warning prefix; if so, transition to `suppressing=true`.
 *  - `suppressing=true`: drop indented lines (stack frames) and blank
 *    lines that follow the warning. The first non-indented, non-blank
 *    line ends suppression and is itself written through.
 *
 * Trade-off: an unrelated indented stderr write that happens to arrive
 * immediately after a filtered warning will also be dropped. Acceptable
 * for CLI noise in practice; documented here for future reference.
 */
export const decideStderrChunk = (text: string, suppressing: boolean): { drop: boolean; suppressing: boolean } => {
  if (suppressing) {
    if (/^\s/.test(text) || text.trim() === '') {
      return { drop: true, suppressing: true };
    }
    // First non-indented line — end suppression and let it through.
    suppressing = false;
  }
  if (TIMEOUT_WARNING_PREFIX_RE.test(text)) {
    return { drop: true, suppressing: true };
  }
  return { drop: false, suppressing: false };
};

/**
 * Filter a buffered stderr blob (e.g. captured from a subprocess) using the
 * same state machine. Test helper.
 */
export const filterStderrBuffer = (buffer: string): string => {
  const lines = buffer.split(/(\n)/);
  let suppressing = false;
  let out = '';
  for (let i = 0; i < lines.length; i += 2) {
    const line = lines[i] ?? '';
    const newline = lines[i + 1] ?? '';
    if (line === '' && newline === '') continue;
    const decision = decideStderrChunk(line + newline, suppressing);
    suppressing = decision.suppressing;
    if (!decision.drop) {
      out += line + newline;
    }
  }
  return out;
};

/**
 * Wrap BOTH `console.warn`/`console.error` (where `warnAfterTimeout` from
 * @dxos/debug actually writes) AND `process.stderr.write` (defence in depth
 * for callers that bypass console). In Bun, `console.warn` writes to fd 2
 * directly — overriding `process.stderr.write` alone is NOT enough. Verified
 * empirically: a `process.stderr.write` wrapper sees zero `console.warn`
 * traffic in bun. See stderr-filter.console.test.ts for the regression
 * guard.
 *
 * The returned restore lambda re-installs the originals so callers (e.g.
 * tests, REPL exit) can revert.
 */
export const installStderrFilter = (): (() => void) => {
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalWrite = process.stderr.write.bind(process.stderr);

  // The same suppression state machine drives every channel — they all dump
  // to fd 2, so a warning fired through one and stack frames fired through
  // another should still be coherent.
  let suppressing = false;

  const handleText = (text: string): { drop: boolean } => {
    const decision = decideStderrChunk(text, suppressing);
    suppressing = decision.suppressing;
    return { drop: decision.drop };
  };

  // console.warn / console.error are passed printf-style args. Format them
  // the same way Node's Console does (concat with space, append newline) so
  // our prefix regex matches the same text the user would have seen.
  const wrapConsole = (variant: 'warn' | 'error', original: (...args: any[]) => void) => {
    return (...args: any[]) => {
      const text = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ') + '\n';
      if (handleText(text).drop) {
        return;
      }
      original(...args);
    };
  };

  console.warn = wrapConsole('warn', originalWarn);
  console.error = wrapConsole('error', originalError);

  (process.stderr as any).write = (chunk: any, ...rest: any[]): boolean => {
    const maybeCallback = rest[rest.length - 1];
    const callback: ((err?: Error | null) => void) | undefined =
      typeof maybeCallback === 'function' ? (maybeCallback as any) : undefined;
    const text = typeof chunk === 'string' ? chunk : (chunk?.toString?.() ?? '');
    if (handleText(text).drop) {
      callback?.();
      return true;
    }
    return originalWrite(chunk, ...rest);
  };

  return () => {
    console.warn = originalWarn;
    console.error = originalError;
    (process.stderr as any).write = originalWrite;
  };
};
