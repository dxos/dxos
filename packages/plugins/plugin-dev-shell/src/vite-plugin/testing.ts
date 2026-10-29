//
// Copyright 2026 DXOS.org
//

import * as http from 'node:http';

import { Shell } from '#shell';

import * as AgentHostMiddleware from './agent-host-middleware.ts';
import * as ShellMiddleware from './shell-middleware.ts';

export type Host = {
  /** Absolute URL to pass as `Shell.ExecOptions.path`. */
  path: string;
  close: () => Promise<void>;
};

/**
 * Serves the middleware from a real http server on an ephemeral port.
 *
 * The client is exercised over an actual socket rather than against a mocked `fetch`, because the
 * parts most likely to break — the content-type gate, streamed stdin, a JSON body — only exist on
 * the wire.
 */
export const startHost = async (options: ShellMiddleware.MakeOptions): Promise<Host> => {
  const middleware = ShellMiddleware.make(options);
  const { origin, close } = await listen(middleware);
  return {
    path: `${origin}${Shell.PATH}`,
    close: async () => {
      await close();
      await middleware.close();
    },
  };
};

export type AgentHost = {
  /** `http://127.0.0.1:<port>`; the agent host route is at {@link Shell.AGENT_HOST_PATH} below it. */
  origin: string;
  /** Stops the agent server, as when it exits; the route starts a new one on its next request. */
  stopServer: () => Promise<void>;
  close: () => Promise<void>;
};

/** Serves the agent host route as {@link startHost} serves the shell route; closing it stops the agent server. */
export const startAgentHost = async (options: AgentHostMiddleware.MakeOptions): Promise<AgentHost> => {
  const host = AgentHostMiddleware.make(options);
  const { origin, close } = await listen(host.middleware);
  return {
    origin,
    stopServer: () => host.close(),
    close: async () => {
      await close();
      await host.close();
    },
  };
};

type Middleware = (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => Promise<void>;

const listen = async (middleware: Middleware): Promise<{ origin: string; close: () => Promise<void> }> => {
  const server = http.createServer((req, res) => {
    middleware(req, res, () => {
      res.writeHead(404);
      res.end();
    }).catch((error) => {
      // A discarded rejection would leave the socket open and stall the run rather than fail it.
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String(error) }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('server did not bind to a port');
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
