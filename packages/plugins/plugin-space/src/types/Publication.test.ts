//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Obj } from '@dxos/echo';

import * as Publication from './Publication.ts';

const OBJECT_PATH = 'db/org.dxos.type.document+01ABC';

describe('Publication', () => {
  test('object paths round-trip between the viewer link, the fork link and Composer', ({ expect }) => {
    const viewer = Publication.viewerUrl('https://view.composer.test', 'pub-1', OBJECT_PATH);
    expect(viewer.toString()).toBe(`https://view.composer.test/pub-1/${OBJECT_PATH}`);

    const fork = Publication.forkUrl('https://composer.test', 'pub-1', OBJECT_PATH);
    expect(fork.searchParams.get(Publication.FORK_PARAM)).toBe('pub-1');
    expect(fork.searchParams.get(Publication.PATH_PARAM)).toBe(OBJECT_PATH);

    expect(Publication.objectPathOf(`/w/SPACE/${OBJECT_PATH}`)).toBe(OBJECT_PATH);
    expect(Publication.parseObjectPath(OBJECT_PATH)).toEqual({ typeSlug: 'org.dxos.type.document', objectId: '01ABC' });
  });

  test('paths that name no object are rejected', ({ expect }) => {
    expect(Publication.objectPathOf('/w/SPACE')).toBeUndefined();
    expect(Publication.objectPathOf('/pub-1/db/x+y')).toBeUndefined();
    expect(Publication.parseObjectPath('home')).toBeUndefined();
  });

  test('space properties keep the receipt until it is cleared on unpublish', ({ expect }) => {
    const properties = Obj.make(SpaceProperties, { name: 'Space' });
    expect(Publication.getReceipt(properties)).toBeUndefined();

    const receipt = { publicId: 'pub-1', publishedAt: '2026-11-16T00:00:00.000Z' };
    Obj.update(properties, (properties) => Annotation.set(properties, Publication.ReceiptAnnotation, receipt));
    expect(Publication.getReceipt(properties)).toEqual(receipt);

    Obj.update(properties, (properties) => Annotation.set(properties, Publication.ReceiptAnnotation, null));
    expect(Publication.getReceipt(properties)).toBeUndefined();
  });
});
