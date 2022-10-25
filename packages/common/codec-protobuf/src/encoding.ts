//
// Copyright 2021 DXOS.org
//

import * as protobuf from 'protobufjs';

export const encodeProtobuf = (root: protobuf.Root): string =>
  JSON.stringify(root.toJSON());

export const decodeProtobuf = (json: string): protobuf.Root =>
  protobuf.Root.fromJSON(JSON.parse(json));
