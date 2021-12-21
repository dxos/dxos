//
// Copyright 2021 DXOS.org
//

import MoleculerWebService from 'moleculer-web';

import { SignalServer } from '../signal';

export const WebService = {
  name: 'web',
  mixins: [
    MoleculerWebService as any
  ],
  created (this: any) {
    this.settings.port = this.broker.metadata.port || 4000;
    this._signal = new SignalServer(this.server, this.broker);
  },
  async started (this: any) {
    return this._signal.open();
  },
  async stopped (this: any) {
    return this._signal.close();
  }
};
