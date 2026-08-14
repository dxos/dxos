//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Sink from 'effect/Sink';
import * as Stdio from 'effect/Stdio';

import * as Wire from './Wire';

/**
 * Platform stdio with the projection's response passes applied to every outgoing message.
 *
 * The passes correct what `McpServer` renders — parameterless tool schemas, ref parameters
 * advertised as an untyped `anyOf`, the server instructions — so they are part of the surface, not
 * of a transport. EDGE applies them to the HTTP body; here they run over the NDJSON line before it
 * reaches stdout, which keeps the two hosts advertising the same tools.
 */
export const layer = Layer.effect(
  Stdio.Stdio,
  Effect.map(Stdio.Stdio, (stdio) =>
    Stdio.make({
      ...stdio,
      stdout: (options) => Sink.mapInput(stdio.stdout(options), normalize),
    }),
  ),
);

const decoder = new TextDecoder();

const normalize = (chunk: string | Uint8Array): string | Uint8Array => {
  const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk);
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return chunk;
  }
  try {
    const message = JSON.parse(trimmed);
    // A batch arrives as an array; each element is a JSON-RPC message in its own right.
    const changed = Array.isArray(message)
      ? message.map((entry) => Wire.normalize(entry)).some(Boolean)
      : Wire.normalize(message);
    return changed ? `${JSON.stringify(message)}\n` : chunk;
  } catch {
    // Not a message we recognise; pass it through rather than corrupting the stream.
    return chunk;
  }
};
