//
// Copyright 2020 DXOS.org
//

import { join } from 'path';
import * as pb from 'protobufjs';

import { splitSchemaIntoNamespaces } from './namespaces';
import { registerResolver } from './resolver';

registerResolver();

test('split namespaces', async () => {
  const root = await pb.load(join(__dirname, '../test/schema.proto'));
  const namespaces = splitSchemaIntoNamespaces(root);

  expect(Array.from(namespaces.keys())).toEqual([
    'dxos.test',
    'dxos.test.any',
    'google.protobuf'
  ]);
});
