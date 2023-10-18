//
// Copyright 2021 DXOS.org
//

import * as protobuf from 'protobufjs';

import { type Struct } from './substitutions';

export const encodeProtobuf = (root: protobuf.Root): Struct => root.toJSON();

export const decodeProtobuf = (struct: Struct): protobuf.Root => protobuf.Root.fromJSON(struct);
