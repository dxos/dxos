//
// Copyright 2021 DXOS.org
//

import jsonCodec from 'buffer-json-encoding';

const { Serializers: { Base: BaseSerializer } } = require('moleculer'); // eslint-disable-line @typescript-eslint/no-var-requires

export class Serializer extends BaseSerializer {
  serialize (obj) {
    return jsonCodec.encode(obj);
  }

  deserialize (buf) {
    return jsonCodec.decode(buf);
  }
}
