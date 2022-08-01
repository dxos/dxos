//
// Copyright 2020 DXOS.org
//

import { join } from 'path';
import * as pb from 'protobufjs';
import { it as test } from 'mocha'
import expect from 'expect'

import { preconfigureProtobufjs } from './configure';
import { splitSchemaIntoNamespaces } from './namespaces';
import { registerResolver } from './parser';

registerResolver();
preconfigureProtobufjs();

test('split namespaces', async () => {
  const root = await pb.load(join(__dirname, '../test/proto/schema.proto'));
  const namespaces = splitSchemaIntoNamespaces(root);

  expect(Array.from(namespaces.keys()).sort()).toEqual([
    'dxos.test',
    'dxos.test.any',
    'dxos.test.extensions',
    'dxos.test.testfoo',
    'google.protobuf'
  ].sort());
});
