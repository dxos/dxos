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
 * Wrap `process.stderr.write` so background timeout warnings are dropped
 * for the lifetime of the process (or until the returned restore function
 * is called).
 *
 * The returned restore lambda re-installs the original write so callers
 * (e.g. tests, REPL exit) can revert.
 *
 * Node's `stream.write` accepts an optional callback as its final arg.
 * We MUST invoke it even when suppressing or any caller awaiting flush
 * completion will hang.
 */
export const installStderrFilter = (): (() => void) => {
  const originalWrite = process.stderr.write.bind(process.stderr);
  let suppressing = false;

  (process.stderr as any).write = (chunk: any, ...rest: any[]): boolean => {
    const maybeCallback = rest[rest.length - 1];
    const callback: ((err?: Error | null) => void) | undefined =
      typeof maybeCallback === 'function' ? (maybeCallback as any) : undefined;
    const text = typeof chunk === 'string' ? chunk : (chunk?.toString?.() ?? '');
    const decision = decideStderrChunk(text, suppressing);
    suppressing = decision.suppressing;
    if (decision.drop) {
      callback?.();
      return true;
    }
    return originalWrite(chunk, ...rest);
  };

  return () => {
    (process.stderr as any).write = originalWrite;
  };
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
