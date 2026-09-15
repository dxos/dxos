//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';

import { MediaArtifact } from '#types';

import { isArtifactRefField } from './ArtifactRefField.tsx';

describe('isArtifactRefField', () => {
  test('recognises a (possibly optional) reference to a media artifact', ({ expect }) => {
    const request = Schema.Struct({
      prompt: Schema.String,
      imageArtifact: Schema.optional(Ref.Ref(MediaArtifact.MediaArtifact)),
      reference: Ref.Ref(MediaArtifact.MediaArtifact),
    });
    expect(isArtifactRefField(request.fields.prompt)).toBe(false);
    expect(isArtifactRefField(request.fields.imageArtifact)).toBe(true);
    expect(isArtifactRefField(request.fields.reference)).toBe(true);
  });
});
