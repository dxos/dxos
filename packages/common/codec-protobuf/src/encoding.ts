//
// Copyright 2021 DXOS.org
//

import pb from 'protobufjs';

export const encodeProtobuf = (root: pb.Root): string => JSON.stringify(root.toJSON());

export const decodeProtobuf = (json: string): pb.Root => pb.Root.fromJSON(JSON.parse(json));
