//
// Copyright 2020 DxOS.
//

const { Serializers: { Base: BaseSerializer } } = require('moleculer');
const jsonCodec = require('buffer-json-encoding');

class Serializer extends BaseSerializer {
  serialize (obj) {
    return jsonCodec.encode(obj);
  }

  deserialize (buf) {
    return jsonCodec.decode(buf);
  }
}

module.exports = { Serializer };
