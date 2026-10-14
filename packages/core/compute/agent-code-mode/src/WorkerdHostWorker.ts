//
// Copyright 2026 DXOS.org
//

/**
 * The outbound target a sandboxed isolate's `fetch` reaches.
 *
 * A loaded isolate can only be handed structured-cloneable values, so a host callback cannot be
 * passed into its `env` — the runtime rejects an RPC reference there. What it does accept is a
 * `Fetcher` as `globalOutbound`, which is why the channel is HTTP-shaped at all.
 *
 * This module is the worker under test, so it shares an isolate with whoever is driving the
 * sandbox and can dispatch to a handler registered from there.
 */

/** Answers one call made by sandboxed code. */
export type HostHandler = (call: { readonly binding: string; readonly args: readonly unknown[] }) => Promise<unknown>;

const handlers = new Map<string, HostHandler>();

/** Registers `handler` for one evaluation, returning the token its isolate calls under. */
export const registerHost = (token: string, handler: HostHandler): (() => void) => {
  handlers.set(token, handler);
  return () => handlers.delete(token);
};

export default {
  async fetch(request: Request): Promise<Response> {
    const token = new URL(request.url).pathname.slice(1);
    const handler = handlers.get(token);
    if (handler === undefined) {
      // Either the evaluation is over or the code forged a token; both mean nothing here will answer.
      return Response.json({ _tag: 'Error', message: `No host for ${token}.` }, { status: 404 });
    }
    const call = (await request.json()) as { binding: string; args: unknown[] };
    try {
      return Response.json({ _tag: 'Ok', value: await handler(call) });
    } catch (error: unknown) {
      return Response.json({ _tag: 'Error', message: error instanceof Error ? error.message : String(error) });
    }
  },
};
