//
// Copyright 2023 DXOS.org
//

import cors from 'cors';
import express from 'express';
import { request, createServer } from 'http';
import httpProxy from 'http-proxy';

const app = express();
const server = createServer(app);
app.use(
  cors({
    preflightContinue: true
  })
);

app.use('/docker', (req, res) => {
  const creq = request(
    {
      method: req.method,
      path: req.url,
      headers: req.headers,
      socketPath: '/var/run/docker.sock'
    },
    (cres) => {
      res.status(cres.statusCode!);
      res.set(cres.headers);
      cres.pipe(res);
    }
  );
  console.log(req.method, req.path);
  req.pipe(creq, { end: true });
});

const proxy = httpProxy.createProxyServer({ ws: true });

app.use('/proxy/:port', (req, res) => {
  // const socket = new Socket()
  // socket.connect(parseInt(req.params.port), 'localhost', () => {
  //   req.pipe(socket, { end: true })
  //   socket.pipe(res, { end: true })
  // })

  console.log(req.method, req.protocol, req.url);

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

server.listen(2376, () => {
  console.log('Proxy listening on port 2376');
});
