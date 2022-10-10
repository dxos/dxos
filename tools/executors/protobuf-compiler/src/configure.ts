//
// Copyright 2021 DXOS.org
//

import { default as pb } from 'protobufjs';
import descriptorJson from 'protobufjs/google/protobuf/descriptor.json' assert { type: 'json' };

/**
 * Manually adds descriptor proto to the list of common protobuf definitions.
 */
export const preconfigureProtobufjs = () => {
  pb.common('descriptor', descriptorJson.nested.google.nested.protobuf.nested);
};
