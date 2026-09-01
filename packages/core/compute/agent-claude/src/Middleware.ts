//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import * as fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as path from 'node:path';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import { AgentHostError } from './errors.ts';
import * as Host from './Host.ts';
import * as Wire from './Wire.ts';

/** Path the host answers on; mounted into a dev server rather than bound to its own port. */
export const PATH = '/api/agent-claude/run';

export type MakeMiddlewareOptions = {
  /** Root that every turn is confined to; a request may narrow it but never escape it. */
  cwd: string;
};

export type RunRequest = {
  prompt: string;
  /** Optional subdirectory of the configured root — see {@link resolveCwd}. */
  cwd?: string;
  maxTurns?: number;
  /** SDK session to continue, so a follow-up turn sees the conversation's history. */
  resume?: string;
  /** With {@link RunRequest.resume}, branch into a new session rather than continuing. */
  fork?: boolean;
};

/**
 * Confines a requested working directory to the configured root.
 *
 * The root is the whole of the host's read scope, so a request that could replace it would make that
 * scope advisory rather than real; anything resolving outside is refused instead of clamped, since
 * silently substituting a different directory would hide the attempt.
 */
export const resolveCwd = (root: string, requested?: string): string => {
  // Real paths on both sides: the root is the SDK's filesystem boundary, so an in-root symlink
  // pointing outside would otherwise smuggle an external directory past the prefix check.
  const realRoot = fs.realpathSync(path.resolve(root));
  if (requested === undefined) {
    return realRoot;
  }

  let real: string;
  try {
    real = fs.realpathSync(path.resolve(realRoot, requested));
  } catch {
    throw new AgentHostError({ message: 'cwd does not exist', context: { root, requested } });
  }
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) {
    throw new AgentHostError({ message: 'cwd outside the configured root', context: { root, requested } });
  }

  return real;
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

    const request: RunRequest = JSON.parse(await readBody(req));
    const { prompt, maxTurns, resume, fork } = request;
    let cwd: string;
    try {
      cwd = resolveCwd(defaultCwd, request.cwd);
    } catch (error) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String(error) }));
      return;
    }

    // Bounded metadata only: the prompt can carry source or credentials, and the session id names an
    // SDK conversation — neither belongs in log sinks.
    log.info('run', { cwd, promptLength: prompt.length, hasResume: resume !== undefined });

    // NDJSON rather than SSE: the client reads it with a plain streaming fetch, and a turn's frames
    // are already newline-delimitable JSON objects.
    res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-cache' });
    const write = (frame: Wire.WireFrame) => res.write(`${JSON.stringify(frame)}\n`);

    const session = new Host.Session({ resume, fork });
    await EffectEx.runPromise(
      session.run({ prompt, cwd, maxTurns }).pipe(
        Stream.runForEach((message) => Effect.sync(() => write(Wire.encode(message)))),
        Effect.match({
          onSuccess: () => write({ end: true, denials: session.denials.length, sessionId: session.sessionId }),
          onFailure: (error) =>
            write({
              end: true,
              denials: session.denials.length,
              sessionId: session.sessionId,
              error: String(error),
            }),
        }),
      ),
    );

    res.end();
  };
