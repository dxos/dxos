//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { createKeyPair, verify } from '@dxos/crypto';
import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { EntityId, SpaceId } from '@dxos/keys';

import { getSharePreviewHeading, sharePreviewKey, sharePreviewKeyOfNode, signWithGuestKey } from './share-preview.ts';

class Note extends Type.makeObject<Note>(DXN.make('org.example.type.note', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'amber' }),
  ),
) {}

describe('share preview', () => {
  test('signs with a guest key as the sodium code the worker uses would verify it', async ({ expect }) => {
    const keypair = createKeyPair();
    const message = 'dxos.shared-objects:space:invitation:1';
    const signature = await signWithGuestKey(message, {
      secretKey: new Uint8Array(keypair.secretKey),
      publicKey: new Uint8Array(keypair.publicKey),
    });

    const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message)));
    expect(verify(digest, Buffer.from(signature, 'base64'), keypair.publicKey)).toBe(true);
    expect(verify(Buffer.from('another message'), Buffer.from(signature, 'base64'), keypair.publicKey)).toBe(false);
  });

  test('finds the first look for both the URL-restored and the resolved plank of the object', ({ expect }) => {
    const spaceId = SpaceId.random();
    const objectId = EntityId.random();
    const key = sharePreviewKey(spaceId, objectId);
    expect(sharePreviewKeyOfNode(`root/${spaceId}/db/org.dxos.type.document+${objectId}`)).toBe(key);
    expect(sharePreviewKeyOfNode(GraphPath.getObjectPath(spaceId, 'org.dxos.type.document', objectId))).toBe(key);
    expect(sharePreviewKeyOfNode('root/settings')).toBeUndefined();
  });

  test('titles an object from its type when the object carries no schema', async ({ expect }) => {
    const noteId = EntityId.random();
    const subject = await Obj.fromJSON({
      'id': noteId,
      '@type': 'dxn:org.example.type.note:0.1.0',
      'name': 'Launch plan',
    });
    expect(Obj.getLabel(subject)).toBeUndefined();
    expect(getSharePreviewHeading(subject, [Note])).toEqual({ label: 'Launch plan', icon: 'ph--note--regular' });
    expect(getSharePreviewHeading(subject, [])).toBeUndefined();
  });
});
