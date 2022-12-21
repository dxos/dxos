//
// Copyright 2022 DXOS.org
//

// TODO(burdon): Factor out.

import { writeFileSync } from 'node:fs';
import { argv } from 'node:process';
import * as pb from 'protobufjs';

import { codegenObjectClass, codegenPlainInterface, codegenSchema, iterTypes } from './codegen';

const packageName = '@dxos/echo-db2';
const types = ['EchoSchema', 'EchoObjectBase', 'TypeFilter', 'OrderedSet'];

const gen = () => {
  const root = new pb.Root();
  root.loadSync(argv[2]);

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

  writeFileSync(argv[3], content.join('\n'));
};

gen();
