//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import { resolve, join } from 'path';
import * as pb from 'protobufjs';

import { preconfigureProtobufjs } from './configure';
import { splitSchemaIntoNamespaces } from './namespaces';
import { registerResolver } from './parser';

test('split namespaces', async () => {
  const baseDir = resolve(process.cwd(), './test/proto');
  registerResolver(baseDir);
  preconfigureProtobufjs();

  const root = await pb.load(join(__dirname, '../test/proto/example/testing/types.proto'));
  const namespaces = splitSchemaIntoNamespaces(root);

  expect(Array.from(namespaces.keys()).sort()).toEqual(
    ['example.testing.any', 'example.testing.types', 'example.testing.util', 'google.protobuf'].sort()
  );
});
