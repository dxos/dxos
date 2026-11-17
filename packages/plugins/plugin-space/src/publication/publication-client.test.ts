//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Obj } from '@dxos/echo';

import { Publication } from '#types';

import { scrubArchive } from './publication-client.ts';

describe('scrubArchive', () => {
  test('drops provenance and the publisher receipt, and lists object ids', ({ expect }) => {
    const properties = Obj.make(SpaceProperties, { name: 'Space' });
    Obj.update(properties, (properties) =>
      Annotation.set(properties, Publication.ReceiptAnnotation, { publicId: 'pub-1', publishedAt: '2026-11-17' }),
    );
    const archive = {
      version: 1,
      originalSpaceId: 'S',
      exportedBy: 'K',
      objects: [Obj.toJSON(properties), { id: 'b' }, {}],
    };

    const { text, objects } = scrubArchive(new TextEncoder().encode(JSON.stringify(archive)));
    const scrubbed = JSON.parse(text);
    expect(scrubbed.originalSpaceId).toBeUndefined();
    expect(scrubbed.exportedBy).toBeUndefined();
    expect(JSON.stringify(archive.objects[0])).toContain(Publication.ReceiptAnnotation.key);
    expect(JSON.stringify(scrubbed.objects[0])).not.toContain(Publication.ReceiptAnnotation.key);
    expect(objects).toEqual([properties.id, 'b']);
  });
});
