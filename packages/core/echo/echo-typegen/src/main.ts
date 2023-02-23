//
// Copyright 2022 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import * as pb from 'protobufjs';

import { SourceBuilder, generate } from './codegen';


export type ProtoResolver = (origin: string, target: string) => string | any | null;

/**
 * Custom proto file resolver.
 */
export function createProtoResolver(original: ProtoResolver, baseDir?: string): ProtoResolver {
  // NOTE: Must be function to preserve `this`.
  return function (this: any, origin, target) {
    if (target === 'dxos/schema.proto') {
      return 'dxos/schema.proto'
    }

    return original.call(this, origin, target);
  };
}

const registerResolver = (baseDir?: string) => {
  pb.Root.prototype.resolvePath = createProtoResolver(pb.Root.prototype.resolvePath, baseDir);
};


const loadProtobufBuiltins = () => {
  const common = require('protobufjs/src/common')

  common("dxos/schema.proto", {
    nested: {
      dxos: {
        nested: {
          schema: {
            nested: {
              Text: {
                fields: {
                  test: {
                    type: "string",
                    id: 1
                  },
                }
              }
            }
          }
        }
      }
    }
  });
}

const main = (source: string, out: string) => {
  console.log(`Reading: ${source}`);
  const root = new pb.Root();
  debugger;
  root.loadSync(source);

  const builder = new SourceBuilder();
  builder.push('/**').push(` * @generated @dxos/echo-typegen ${source}`).push(' **/').nl();
  generate(builder, root);

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, builder.content);
  console.log(`Output: ${out}`);
};

// TODO(burdon): Yargs
const [, , source, out] = argv;

registerResolver();
loadProtobufBuiltins();

main(source, out);
