//
// Copyright 2022 DXOS.org
//

import { writeFileSync } from 'node:fs';
import { argv } from 'node:process';
import * as pb from 'protobufjs';

import { codegenClass, codegenSchema, iterTypes } from './codegen';

const root = new pb.Root();

root.loadSync(argv[2]);

const packageName = '@dxos/echo-db2';

let content = `
import { EchoSchema, EchoObjectBase, TypeFilter, OrderedSet } from "${packageName}";

`;

content += codegenSchema(root);
content += 'export const schema = EchoSchema.fromJson(schemaJson);\n';

for (const type of iterTypes(root)) {
  if (type.options?.['(object)'] !== true) {
    continue;
  }

  content += codegenClass(type);
  content += '\n';
}

writeFileSync(argv[3], content);
