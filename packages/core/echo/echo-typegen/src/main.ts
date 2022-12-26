//
// Copyright 2022 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import * as pb from 'protobufjs';

import { codegenObjectClass, codegenPlainInterface, codegenSchema, iterTypes } from './codegen';

const packageName = '@dxos/echo-schema';

const types = ['EchoSchema', 'EchoObjectBase', 'TypeFilter', 'OrderedSet'];

const gen = (source: string, out: string) => {
  const root = new pb.Root();
  root.loadSync(source);

  // TODO(burdon): Use plate or format code after generation.
  const content = [];
  content.push(`import { ${types.join(', ')} } from "${packageName}";\n`);
  content.push(codegenSchema(root) + '\n');
  content.push('export const schema = EchoSchema.fromJson(schemaJson);\n');
  for (const type of iterTypes(root)) {
    if (type.options?.['(object)'] !== true) {
      content.push(codegenPlainInterface(type));
    } else {
      content.push(codegenObjectClass(type));
    }

    content.push('');
  }

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, content.join('\n'));
};

// TODO(burdon): Yargs
const [, , source, out] = argv;

gen(source, out);
