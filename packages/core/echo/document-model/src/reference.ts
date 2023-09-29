//
// Copyright 2022 DXOS.org
//

import { ItemID } from '@dxos/protocols';
import { Reference as ReferenceValue } from '@dxos/protocols/proto/dxos/echo/model/document';

export class Reference {
  static fromValue(value: ReferenceValue): Reference {
    return new Reference(value.itemId, value.protocol, value.host);
  }

  static fromLegacyTypeName(type: string): Reference {
    return new Reference(type, 'protobuf', 'dxos.org');
  }

  constructor(public readonly itemId: ItemID, public readonly protocol?: string, public readonly host?: string) {}

  encode(): ReferenceValue {
    return { itemId: this.itemId, host: this.host, protocol: this.protocol };
  }
}
