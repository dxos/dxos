//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as PublicationLink from './PublicationLink.ts';
import * as PublicationManifest from './PublicationManifest.ts';

const OBJECT_PATH = 'db/org.dxos.type.document+01HZX00000000000000000000A';

describe('PublicationLink', () => {
  test('object paths round-trip between the viewer link, the fork link and Composer', ({ expect }) => {
    const viewer = PublicationLink.viewerUrl('https://view.composer.test', 'pub-1', OBJECT_PATH);
    expect(viewer.toString()).toBe(`https://view.composer.test/pub-1/${OBJECT_PATH}`);

    const fork = PublicationLink.forkUrl('https://composer.test', 'pub-1', OBJECT_PATH);
    expect(fork.searchParams.get(PublicationManifest.FORK_PARAM)).toBe('pub-1');
    expect(fork.searchParams.get(PublicationManifest.PATH_PARAM)).toBe(OBJECT_PATH);

    expect(PublicationLink.objectPathOf(`/w/SPACE/${OBJECT_PATH}`)).toBe(OBJECT_PATH);
  });

  test('pathnames that name no object have no object path', ({ expect }) => {
    expect(PublicationLink.objectPathOf('/w/SPACE')).toBeUndefined();
    expect(PublicationLink.objectPathOf('/pub-1/db/x+y')).toBeUndefined();
  });
});
