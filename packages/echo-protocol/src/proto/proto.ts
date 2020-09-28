//
// Copyright 2020 DXOS.org
//

import { dxos as dxos1 } from './gen/dxos';
import ProtoSchema from './gen/dxos.json';

export const Schema = ProtoSchema;

// This seems to be the only working way to re-export a namespace to prevent collisions.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace protocol {
  // eslint-disable-next-line import/first
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export import dxos = dxos1
}
