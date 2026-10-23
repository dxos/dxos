//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import { EntityId, SpaceId } from '@dxos/keys';

import { InvalidSharePayloadError } from '../errors.ts';
import { type SharePayload, decodeSharePayload, encodeSharePayload } from './share-payload.ts';

const payload: SharePayload = {
  v: 1,
  spaceId: SpaceId.random(),
  objectId: EntityId.random(),
  typeSlug: 'org.dxos.type.document',
  invitation: 'x'.repeat(200),
  plugins: ['org.dxos.plugin.markdown'],
  objects: Array.from({ length: 5 }, () => EntityId.random()),
};

/** Encodes any JSON the way {@link encodeSharePayload} does, to build payloads it would refuse to produce. */
const encodeJson = async (value: unknown): Promise<string> => {
  const stream = new Blob([JSON.stringify(value)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
};

const decodeError = (encoded: string) => EffectEx.runPromise(Effect.flip(decodeSharePayload(encoded)));

describe('share payload', () => {
  test('round-trips through a URL-safe string', async ({ expect }) => {
    const encoded = await EffectEx.runPromise(encodeSharePayload(payload));
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await EffectEx.runPromise(decodeSharePayload(encoded))).toEqual(payload);
  });

  test('survives a URL query parameter', async ({ expect }) => {
    const url = new URL('https://composer.space/w/space/db/doc+id');
    url.searchParams.set('share', await EffectEx.runPromise(encodeSharePayload(payload)));
    const encoded = new URL(url.toString()).searchParams.get('share') ?? '';
    expect(await EffectEx.runPromise(decodeSharePayload(encoded))).toEqual(payload);
  });

  test('rejects garbage', async ({ expect }) => {
    expect(InvalidSharePayloadError.is(await decodeError('not-a-payload'))).toBe(true);
    expect(InvalidSharePayloadError.is(await decodeError(await encodeJson({ hello: 'world' })))).toBe(true);
  });

  test('rejects a payload from another version rather than half-applying it', async ({ expect }) => {
    expect(InvalidSharePayloadError.is(await decodeError(await encodeJson({ ...payload, v: 2 })))).toBe(true);
  });
});
