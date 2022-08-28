//
// Copyright 2021 DXOS.org
//

import pb from 'protobufjs';

/**
 * Manually adds descriptor proto to the list of common protobuf definitions.
 */
export const preconfigureProtobufjs = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  pb.common('descriptor', require('protobufjs/google/protobuf/descriptor.json').nested.google.nested.protobuf.nested);
};
