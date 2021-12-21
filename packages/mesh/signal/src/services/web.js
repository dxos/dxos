//
// Copyright 2021 DXOS.org
//

import MoleculerWebService from 'moleculer-web';

import { SignalServer } from '../signal';

export const WebService = {
  name: 'web',
  mixins: [
    MoleculerWebService
  ],
  created () {
    this.settings.port = this.broker.metadata.port || 4000;
    this._signal = new SignalServer(this.server, this.broker);
  },
  async started () {
    return this._signal.open();
  },
  async stopped () {
    return this._signal.close();
  }
};
