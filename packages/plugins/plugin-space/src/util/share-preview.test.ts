//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { createKeyPair, verify } from '@dxos/crypto';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { EntityId, SpaceId } from '@dxos/keys';

import {
  decodeSharedObjects,
  getSharePreviewHeading,
  sharePreviewKey,
  sharePreviewKeyOfNode,
  signWithGuestKey,
} from './share-preview.ts';

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

  test('decodes the shared object with its references resolved among the shared objects', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const documentId = EntityId.random();
    const textId = EntityId.random();
    const objects = [
      {
        id: documentId,
        objectJson: JSON.stringify({
          'id': documentId,
          '@type': 'dxn:org.example.type.note:0.1.0',
          'name': 'Pricing notes',
          'content': { '/': `echo:///${textId}` },
        }),
        heads: [],
      },
      {
        id: textId,
        objectJson: JSON.stringify({
          'id': textId,
          '@type': 'dxn:org.example.type.text:0.1.0',
          'content': '# Pricing',
        }),
        heads: [],
      },
    ];

    const preview = await EffectEx.runPromise(decodeSharedObjects(spaceId, documentId, objects));
    const subject = preview?.subject;
    invariant(subject && 'name' in subject && 'content' in subject && Ref.isRef(subject.content));
    expect(subject.name).toBe('Pricing notes');
    expect(subject.content.target).toMatchObject({ content: '# Pricing' });

    expect(await EffectEx.runPromise(decodeSharedObjects(spaceId, EntityId.random(), objects))).toBeUndefined();
    const failure = await EffectEx.runPromise(
      Effect.flip(decodeSharedObjects(spaceId, documentId, [{ id: documentId, objectJson: '{}', heads: [] }])),
    );
    expect(failure.message).toBe('A shared object could not be decoded.');
  });

  test('titles a first look from its type, which the decoded object does not carry', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const noteId = EntityId.random();
    const objects = [
      {
        id: noteId,
        objectJson: JSON.stringify({ 'id': noteId, '@type': 'dxn:org.example.type.note:0.1.0', 'name': 'Launch plan' }),
        heads: [],
      },
    ];

    const preview = await EffectEx.runPromise(decodeSharedObjects(spaceId, noteId, objects));
    invariant(preview);
    expect(Obj.getLabel(preview.subject)).toBeUndefined();
    expect(getSharePreviewHeading(preview.subject, [Note])).toEqual({
      label: 'Launch plan',
      icon: 'ph--note--regular',
    });
    expect(getSharePreviewHeading(preview.subject, [])).toBeUndefined();
  });
});
