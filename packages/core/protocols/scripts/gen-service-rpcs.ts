//
// Copyright 2026 DXOS.org
//

//
// Regenerates the effect-rpc service definition modules (src/<Service>.ts) from the protobuf
// service descriptors. Run after changing client service protos:
//   moon run protocols:prebuild && pnpm exec vite-node scripts/gen-service-rpcs.ts
//

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { schema } from '../src/proto/gen/index.ts';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '../src');

/**
 * Services exposed over the client services RPC connection.
 * Keys double as the rpc tag prefix and must match the `ClientServices` keys in @dxos/client-protocol.
 *
 * Empty on purpose: every client service is now hand-authored (payload schemas inlined per
 * `service-rpc-schemas.md`'s rule), so none can be safely regenerated from a proto descriptor
 * without clobbering that work. Kept as the generator's entry point in case a genuinely new,
 * not-yet-hand-authored service needs scaffolding from a proto `service {}` block in the future.
 */
const SERVICES: ReadonlyArray<{ key: string; fqn: string }> = [];

const EMPTY = 'google.protobuf.Empty';

for (const { key, fqn } of SERVICES) {
  const descriptor = schema.getService(fqn as Parameters<typeof schema.getService>[0]);
  const service = descriptor.serviceProto;

  const rpcs = service.methodsArray.map((method) => {
    method.resolve();
    const name = method.name[0].toLowerCase() + method.name.slice(1);
    const requestType = method.resolvedRequestType!.fullName.replace(/^\./, '');
    const responseType = method.resolvedResponseType!.fullName.replace(/^\./, '');

    const options: string[] = [];
    if (requestType !== EMPTY) {
      options.push(`payload: protoMessage('${requestType}'),`);
    }
    if (responseType !== EMPTY) {
      options.push(`success: protoMessage('${responseType}'),`);
    }
    options.push('error: serviceError,');
    if (method.responseStream) {
      options.push('stream: true,');
    }

    return `  Rpc.make('${name}', {\n${options.map((line) => `    ${line}`).join('\n')}\n  }),`;
  });

  const content = `//
// Copyright 2026 DXOS.org
//

import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';

/**
 * Effect RPC definitions for \`${fqn}\`.
 * Generated from the protobuf service definition; payloads are protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
${rpcs.join('\n')}
).prefix('${key}.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}
`;

  writeFileSync(join(SRC_DIR, `${key}.ts`), content);
  // eslint-disable-next-line no-console
  console.log(`generated ${key}.ts (${service.methodsArray.length} methods)`);
}
