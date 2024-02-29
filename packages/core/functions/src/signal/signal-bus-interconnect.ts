//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { ComplexMap, entry } from '@dxos/util';

import { SignalBus } from './signal-bus';

export class SignalBusInterconnect {
  private readonly busses = new ComplexMap<Space, SignalBus>((space) => space.key.toHex());

  public createConnected(space: Space): SignalBus {
    return entry(this.busses, space).orInsert(new SignalBus(space)).value;
  }
}
