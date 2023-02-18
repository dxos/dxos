//
// Copyright 2022 DXOS.org
//

import { ItemID } from '@dxos/protocols';
import { Reference as ReferenceValue } from '@dxos/protocols/proto/dxos/echo/model/document';

export class Reference {
  static fromValue(value: ReferenceValue): Reference {
    return new Reference(value.itemId);
  }

  // prettier-ignore
  constructor(
    public readonly itemId: ItemID
  ) {}

  encode(): ReferenceValue {
    return { itemId: this.itemId };
  }
}
