//
// Copyright 2023 DXOS.org
//

import cors from 'cors';
import express from 'express';
import { request, createServer } from 'http';
import httpProxy from 'http-proxy';

/**
 * Web server proxies web socket requests from DXOS Apps to the Docker daemon.
 */

const PROXY_PORT = 2376; // TODO(burdon): Config.

const app = express();
const server = createServer(app);
const proxy = httpProxy.createProxyServer({ ws: true });

app.use(
  cors({
    preflightContinue: true
  })
);

app.use('/docker', (req, res) => {
  const proxiedReq = request(
    {
      method: req.method,
      path: req.url,
      headers: req.headers,
      socketPath: '/var/run/docker.sock'
    },
    (proxiedRes) => {
      res.status(proxiedRes.statusCode!);
      res.set(proxiedRes.headers);
      proxiedRes.pipe(res);
    }
  );

  console.log(req.method, req.path);
  req.pipe(proxiedReq, { end: true });
});

app.use('/proxy/:port', (req, res) => {
  proxy.web(
    req,
    res,
    {
      target: `${req.protocol}://localhost:${req.params.port}`,
      ws: true
    },
    (err) => {
      console.error(err);
      res.destroy(err);
    }
  );
});

server.on('upgrade', (req, socket, head) => {
  const port = parseInt(req.url!.split('/')[2] as any);
  console.log('upgrade', req.url, port);

  proxy.ws(req, socket, head, {
    target: `ws://localhost:${port}`
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`Proxy listening on port ${PROXY_PORT}`);
});
