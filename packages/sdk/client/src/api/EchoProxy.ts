//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { Party } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import { ClientServiceProvider } from '../interfaces';

const log = debug('dxos:client:echo');

export class EchoProxy {
  constructor (private readonly _serviceProvider: ClientServiceProvider) {}

  toString () {
    return `EchoProxy`;
  }

}
