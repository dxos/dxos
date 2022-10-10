//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import { resolve, join } from 'path';
import { default as pb } from 'protobufjs';;

import { preconfigureProtobufjs } from './configure.js';
import { splitSchemaIntoNamespaces } from './namespaces.js';
import { registerResolver } from './parser/index.js';

test('split namespaces', async () => {
  const baseDir = resolve(process.cwd(), './test/proto');
  registerResolver(baseDir);
  preconfigureProtobufjs();

  const root = await pb.load(new URL('../test/proto/example/testing/types.proto', import.meta.url).pathname);
  const namespaces = splitSchemaIntoNamespaces(root);

  expect(Array.from(namespaces.keys()).sort()).toEqual([
    'example.testing.any',
    'example.testing.types',
    'example.testing.util',
    'google.protobuf'
  ].sort());
});
