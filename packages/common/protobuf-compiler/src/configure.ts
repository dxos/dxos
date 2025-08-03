//
// Copyright 2021 DXOS.org
//

import { createRequire } from 'node:module';

import pb from 'protobufjs';

const require = createRequire(import.meta.url);

/**
 * Manually adds descriptor proto to the list of common protobuf definitions.
 */
export const preconfigureProtobufjs = () => {
  pb.common(
    'descriptor',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('protobufjs/google/protobuf/descriptor.json').nested.google.nested.protobuf.nested,
  );
};
