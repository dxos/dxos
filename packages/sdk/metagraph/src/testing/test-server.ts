//
// Copyright 2022 DXOS.org
//

import http from 'http';

import { log } from '@dxos/log';

export class TestServer {
  private readonly _server = http.createServer((req, res) => {
    log('query', { url: req.url });
    if (!req.url) {
      res.writeHead(400);
      res.end();
      return;
    }

    const path = req.url.slice(1);
    const result = this._data[path];
    if (!result) {
      res.writeHead(400);
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(
      JSON.stringify({
        [path]: result
      })
    );
  });

  constructor(private readonly _data: any) {}

  start() {
    log('starting...');
    this._server.listen(8080);
  }

  stop() {
    log('stopping...');
    this._server.close();
  }
}
