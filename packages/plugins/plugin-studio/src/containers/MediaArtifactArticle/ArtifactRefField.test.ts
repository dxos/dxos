//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Format, Ref } from '@dxos/echo';

import { GenerationService, MediaArtifact } from '#types';

import { isArtifactRefField } from './ArtifactRefField.tsx';
import { fileUrlOptions } from './FileUrlField.tsx';

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

describe('fileUrlOptions', () => {
  test('reads the upload options off a (possibly optional) annotated URL field', ({ expect }) => {
    const request = Schema.Struct({
      imageUrl: Schema.optional(
        Schema.String.pipe(
          Format.FormatAnnotation.set(Format.TypeFormat.URL),
          GenerationService.FileUrlAnnotation.set({ accept: 'image/*' }),
          Schema.annotate({ title: 'Still' }),
        ),
      ),
      plain: Schema.String,
    });
    expect(fileUrlOptions(request.fields.imageUrl)).toEqual({ accept: 'image/*' });
    expect(fileUrlOptions(request.fields.plain)).toBeUndefined();
  });
});
