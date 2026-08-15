//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import * as Host from './Host';
import * as Wire from './Wire';

/** Path the host answers on; mounted into a dev server rather than bound to its own port. */
export const PATH = '/api/agent-claude/run';

export type MakeMiddlewareOptions = {
  /** Working directory turns are scoped to when a request does not name one. */
  cwd: string;
};

export type RunRequest = {
  prompt: string;
  cwd?: string;
  maxTurns?: number;
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

/**
 * Connect-style middleware streaming a turn as NDJSON.
 *
 * Hosted by the caller's dev server rather than listening on its own port, so the browser reaches
 * it same-origin — no CORS, and no process for a test run to supervise. A standalone managed
 * process is the shape Composer needs, not the shape a story needs.
 */
export const make =
  ({ cwd: defaultCwd }: MakeMiddlewareOptions) =>
  async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
    if (req.method !== 'POST' || !req.url?.startsWith(PATH)) {
      return next();
    }

    const { prompt, cwd = defaultCwd, maxTurns }: RunRequest = JSON.parse(await readBody(req));
    log.info('run', { prompt, cwd });

    // NDJSON rather than SSE: the client reads it with a plain streaming fetch, and a turn's frames
    // are already newline-delimitable JSON objects.
    res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-cache' });
    const write = (frame: Wire.WireFrame) => res.write(`${JSON.stringify(frame)}\n`);

    const session = new Host.Session();
    await EffectEx.runPromise(
      session.run({ prompt, cwd, maxTurns }).pipe(
        Stream.runForEach((message) => Effect.sync(() => write(Wire.encode(message)))),
        Effect.match({
          onSuccess: () => write({ end: true, denials: session.denials.length }),
          onFailure: (error) => write({ end: true, denials: session.denials.length, error: String(error) }),
        }),
      ),
    );

    res.end();
  };
