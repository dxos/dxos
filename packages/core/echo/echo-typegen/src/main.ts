//
// Copyright 2022 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import * as pb from 'protobufjs';

import { SourceBuilder, generate } from './codegen';

const main = (source: string, out: string) => {
  const root = new pb.Root();
  root.loadSync(source);

  const builder = new SourceBuilder();
  builder.push('//').push(`// Generated from ${source}`).push('//').nl();
  generate(builder, root);

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, builder.content);
};

// TODO(burdon): Yargs
const [, , source, out] = argv;

main(source, out);
