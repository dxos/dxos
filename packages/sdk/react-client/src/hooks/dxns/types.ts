//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Factor out constants to client.
export const DXOS_TYPE_BOT = 'dxos:bot';
export const DXOS_TYPE_BOT_FACTORY = 'dxos:bot-factory';

// Registry client has no types.
export interface QueryRecord {
  attributes: {
    version: string;
    name: string;
    topic: string;
    keywords?: string[];
  };
  names: string[];
}
