//
// Copyright 2025 DXOS.org
//

import http from 'http';

import { log } from '@dxos/log';

export type TestServer = {
  url: string;
  close: () => void;
};

export type ResponseHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

export const createTestServer = (responseHandler: ResponseHandler) => {
  const server = http.createServer(responseHandler);

  return new Promise<TestServer>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://localhost:${port}`,
        close: () => server.close(),
      });
    });
  });
};

export const responseHandler = (cb: (attempt: number) => false | object): ResponseHandler => {
  let attempt = 0;
  return (req, res) => {
    const data = cb(++attempt) ?? {};
    if (data === false) {
      log('simulating failure', { attempt });
      res.statusCode = 500;
      res.statusMessage = 'Simulating failure';
      res.end('');
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data }));
    }
  };
};
