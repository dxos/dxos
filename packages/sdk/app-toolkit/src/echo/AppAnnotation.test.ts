//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Obj } from '@dxos/echo';

import * as AppAnnotation from './AppAnnotation.ts';

describe('AppAnnotation', () => {
  test('a space reads as published until its publication is cleared', ({ expect }) => {
    const properties = Obj.make(SpaceProperties, { name: 'Space' });
    expect(AppAnnotation.getPublication(properties)).toBeUndefined();

    const publication = { publicId: 'pub-1', publishedAt: '2026-11-16T00:00:00.000Z' };
    Obj.update(properties, (properties) =>
      Annotation.set(properties, AppAnnotation.PublicationAnnotation, publication),
    );
    expect(AppAnnotation.getPublication(properties)).toEqual(publication);

    Obj.update(properties, (properties) => Annotation.set(properties, AppAnnotation.PublicationAnnotation, null));
    expect(AppAnnotation.getPublication(properties)).toBeUndefined();
  });
});
