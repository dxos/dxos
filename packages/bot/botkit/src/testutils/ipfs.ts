//
// Copyright 2021 DXOS.org
//

import express, { Application, Request, Response } from 'express';
import { Server } from 'http';

export class IPFS {
  private _app: Application = express();

  _server: Server = {} as Server;

  constructor (
    private _port: number,
    private _filePaths: Record<string, string>
  ) {
    this._app.get('/:hash', (req: Request, res: Response) => {
      const ipfsCid = req.params.hash;
      const filePath = this._filePaths[ipfsCid];
      res.download(filePath);
    });
  }

  async start (): Promise<void> {
    return new Promise(resolve => {
      this._server = this._app.listen(this._port, resolve);
    });
  }

  async stop (): Promise<void> {
    this._server.close();
  }
}
