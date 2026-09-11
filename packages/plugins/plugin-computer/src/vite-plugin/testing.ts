//
// Copyright 2026 DXOS.org
//

import * as http from 'node:http';

import { Shell } from '#shell';

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
    path: `http://127.0.0.1:${address.port}${Shell.PATH}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
