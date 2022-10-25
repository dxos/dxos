//
// Copyright 2021 DXOS.org
//

import protobuf from 'protobufjs';

interface ProtobufJson {
  nested?: Record<string, ProtobufJson>;
  [K: string]: any;
}

const postprocessProtobufJson = (protobufJson: ProtobufJson): ProtobufJson => {
  if (!protobufJson.nested) {
    return protobufJson;
  }

  const newNested = Object.fromEntries(
    Object.entries(protobufJson.nested)
      .sort((b, a) => b[0].localeCompare(a[0]))
      .map(([key, value]) => [key, postprocessProtobufJson(value)])
  );

  return {
    ...protobufJson,
    nested: newNested
  };
};

export const serializeSchemaToJson = (root: protobuf.Root): any =>
  postprocessProtobufJson(root.toJSON({ keepComments: true }));
