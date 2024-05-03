//
// Copyright 2022 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import * as pb from 'protobufjs';

import { log } from '@dxos/log';
import { ts } from '@dxos/plate';

import { generate } from './codegen';

export type ProtoResolver = (origin: string, target: string) => string | any | null;

/**
 * Custom proto file resolver.
 */
export function createProtoResolver(original: ProtoResolver, baseDir?: string): ProtoResolver {
  // NOTE: Must be function to preserve `this`.
  return function (this: any, origin, target) {
    if (target === 'dxos/schema.proto') {
      return 'dxos/schema.proto';
    }

    return original.call(this, origin, target);
  };
}

const registerResolver = (baseDir?: string) => {
  pb.Root.prototype.resolvePath = createProtoResolver(pb.Root.prototype.resolvePath, baseDir);
};

const loadProtobufBuiltins = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const common = require('protobufjs/src/common');

  common('dxos/schema.proto', {
    nested: {
      dxos: {
        nested: {
          schema: {
            nested: {
              Text: {
                fields: {
                  test: {
                    type: 'string',
                    id: 1,
                  },
                },
              },
              Expando: {
                fields: {
                  test: {
                    type: 'string',
                    id: 1,
                  },
                },
              },
              TypedObject: {
                fields: {
                  test: {
                    type: 'string',
                    id: 1,
                  },
                },
              },
              Schema: {
                fields: {
                  test: {
                    type: 'string',
                    id: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });
};

const main = async (source: string, out: string, schemaPackage: string) => {
  log.info(`Reading: ${source}`);
  const root = new pb.Root();
  root.loadSync(source);

  const code = await ts`
  /**
   * @generated @dxos/echo-typegen ${source}
   **/

  ${generate(root, { schemaPackage })}
  `;

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, code);
  log.info(`Output: ${out}`);
};

// TODO(burdon): Yargs
const args = argv.slice(2);

let schemaPackage = '@dxos/echo-schema';
{
  const idx = args.findIndex((x) => x === '--schema-package');
  if (idx !== -1) {
    schemaPackage = args[idx + 1];
    args.splice(idx, 2);
  }
}

const [source, out] = args;

registerResolver();
loadProtobufBuiltins();

void main(source, out, schemaPackage);
