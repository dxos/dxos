//
// Copyright 2022 DXOS.org
//

import { type ItemID } from '@dxos/protocols';
import { type Reference as ReferenceValue } from '@dxos/protocols/proto/dxos/echo/model/document';

// TODO(burdon): Comment.
export class Reference {
  static fromValue(value: ReferenceValue): Reference {
    return new Reference(value.itemId, value.protocol, value.host);
  }

  /**
   * @deprecated
   */
  // TODO(burdon): Document/remove?
  static fromLegacyTypename(type: string): Reference {
    return new Reference(type, 'protobuf', 'dxos.org');
  }

  // prettier-ignore
  constructor(
    public readonly itemId: ItemID,
    public readonly protocol?: string,
    public readonly host?: string
  ) {}

  encode(): ReferenceValue {
    return { itemId: this.itemId, host: this.host, protocol: this.protocol };
  }
}
