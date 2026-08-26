//
// Copyright 2026 DXOS.org
//

import { type GenMessage } from '@bufbuild/protobuf/codegenv2';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { bufRegistry } from './buf/registry.ts';
import { decodeCompat, encodeCompat } from './buf/shape-compat.ts';
import { schema } from './proto/gen/index.ts';

const GEN_DIR = join(dirname(fileURLToPath(import.meta.url)), 'buf/proto/gen');

const generatedModulePaths = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? generatedModulePaths(path) : entry.name.endsWith('_pb.ts') ? [path] : [];
  });

// Messages, enums and services all carry `typeName`, so completeness uses the kind-agnostic `get`.
const isGenDesc = (value: unknown): value is GenMessage<never> =>
  typeof value === 'object' && value !== null && typeof (value as { typeName?: unknown }).typeName === 'string';

// A type routed through buf must serialise byte-identically, or the peer decodes garbage.
const CASES: Array<{ typeName: string; value: any }> = [
  { typeName: 'dxos.error.Error', value: { name: 'TestError', message: 'failed', context: { attempt: 2 } } },
  { typeName: 'dxos.client.services.ContactBook', value: { contacts: [{ identityKey: PublicKey.random() }] } },
  { typeName: 'dxos.client.services.Platform', value: { type: 1, platform: 'linux', runtime: 'node' } },
  {
    typeName: 'dxos.mesh.bridge.ConnectionRequest',
    value: { proxyId: PublicKey.random(), initiator: true, remotePeerKey: 'remote', ownPeerKey: 'own', topic: 'topic' },
  },
];

describe('service-rpc codec routing', () => {
  test('the registry covers every generated buf module', async ({ expect }) => {
    // An unlisted `.proto` file would silently keep its types on protobuf.js rather than failing.
    const missing: string[] = [];
    for (const path of generatedModulePaths(GEN_DIR)) {
      const module: Record<string, unknown> = await import(path);
      for (const value of Object.values(module)) {
        if (isGenDesc(value) && bufRegistry.get(value.typeName) === undefined) {
          missing.push(value.typeName);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  for (const { typeName, value } of CASES) {
    test(`${typeName} round-trips byte-identically through both codecs`, ({ expect }) => {
      const desc = bufRegistry.getMessage(typeName);
      invariant(desc, `not in the buf registry: ${typeName}`);
      const legacyBytes = schema.tryGetCodecForType(typeName).encode(value);
      // Both sides are normalised: the protobuf.js codec returns a `Buffer`, buf a `Uint8Array`.
      expect(new Uint8Array(encodeCompat(desc, value))).toEqual(new Uint8Array(legacyBytes));
      expect(decodeCompat(desc, legacyBytes)).toMatchObject(value);
    });
  }
});
