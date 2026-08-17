//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Deliberately dependency-free. This module is resolved separately from its consumer, so importing
// `@dxos/types` here would load a second copy into the page: ECHO objects built against it register
// a rival schema and never match the consumer's queries. The frame shapes are therefore structural,
// and callers decode them with their own `Message.make`.

/** Mirrors `Middleware.PATH`, which cannot be imported here — that module is node-only. */
export const PATH = '/api/agent-claude/run';

/** Structural twin of `Wire.WireMessage`; `blocks` are `ContentBlock.Any` to a consumer. */
export type Frame = {
  role: 'user' | 'assistant' | 'tool';
  created: string;
  threadId?: string;
  blocks: readonly any[];
  properties?: Record<string, unknown>;
};

/** Structural twin of `Wire.WireEnd`. */
export type End = {
  end: true;
  denials: number;
  /** Session the turn ran under — pass back as `resume` to continue, or with `fork` to branch. */
  sessionId?: string;
  error?: string;
};

export const isEnd = (frame: Frame | End): frame is End => 'end' in frame;

export type RunOptions = {
  prompt: string;
  /** Subdirectory of the host's configured root; the host refuses anything outside it. */
  cwd?: string;
  maxTurns?: number;
  /** Session to continue, from an earlier run's {@link End}. */
  resume?: string;
  /** With {@link RunOptions.resume}, branch instead of continuing. */
  fork?: boolean;
  signal?: AbortSignal;
  /** Defaults to {@link PATH}; override when the host is mounted elsewhere. */
  path?: string;
};

/**
 * Streams a turn from the host, yielding each NDJSON frame as it arrives.
 *
 * The terminal {@link End} carries the session id, so a caller continues a conversation by passing
 * it back as `resume` — or branches by passing it with `fork`.
 */
export const run = async function* ({
  prompt,
  cwd,
  maxTurns,
  resume,
  fork,
  signal,
  path = PATH,
}: RunOptions): AsyncGenerator<Frame | End> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, cwd, maxTurns, resume, fork }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`agent host responded ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let terminated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Whatever follows the last newline is an incomplete frame; hold it for the next chunk.
    buffer = lines.pop() ?? '';
    for (const line of lines.filter(Boolean)) {
      const frame: Frame | End = JSON.parse(line);
      terminated ||= isEnd(frame);
      yield frame;
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const frame: Frame | End = JSON.parse(buffer);
    terminated ||= isEnd(frame);
    yield frame;
  }
  // A close without the terminal frame is a truncated turn; surfacing it beats a caller reading
  // `end === undefined` as success.
  if (!terminated) {
    throw new Error('agent host stream ended without a terminal frame');
  }
};
