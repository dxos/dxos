//
// Copyright 2023 DXOS.org
//

import cors from 'cors';
import express from 'express';
import { request, createServer } from 'http';
import httpProxy from 'http-proxy';

import { log } from '@dxos/log';

import { DX_BOT_SERVICE_PORT } from './defs';

/**
 * Web server proxies web socket requests from DXOS Apps to the Docker daemon.
 */

const app = express();
const server = createServer(app);
const proxy = httpProxy.createProxyServer({ ws: true });

app.use(
  cors({
    preflightContinue: true
  })
);

/**
 * Proxy Docker requests.
 */
app.use('/docker', (req, res) => {
  log.info('docker request', { url: req.url });
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

  req.pipe(proxiedReq, { end: true });
});

/**
 * Proxy DXRPC requests.
 */
app.use('/proxy/:port', (req, res) => {
  log.info('proxying', { port: req.params.port });
  proxy.web(
    req,
    res,
    {
      target: `${req.protocol}://localhost:${req.params.port}`,
      ws: true
    },
    (err: any) => {
      log.error(err);
      res.destroy(err);
    }
  );
});

/**
 * Upgrade DXRPC request to websocket.
 */
server.on('upgrade', (req, socket, head) => {
  const port = parseInt(req.url!.split('/')[2] as any);
  log.info('upgrade', { url: req.url, port });

  proxy.ws(req, socket, head, {
    target: `ws://localhost:${port}`
  });
});

server.listen(DX_BOT_SERVICE_PORT, () => {
  log.info(`Proxy listening on port ${DX_BOT_SERVICE_PORT}`);
});
