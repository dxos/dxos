//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';

/** Media kind produced by a Generation. */
export const Kind = Schema.Literal('video', 'audio');
export type Kind = Schema.Schema.Type<typeof Kind>;

/**
 * AI media generation artefact.
 * `prompt` is a ref to a markdown Text document the user edits inline.
 * `url` is populated by the active GenerationProvider on success.
 * `avatarId` / `voiceId` are provider-agnostic identifiers a GenerationProvider
 * may use when the underlying service supports them.
 */
export const Generation = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  type: Kind.annotations({ title: 'Type' }),
  avatarId: Schema.optional(
    Schema.String.annotations({
      title: 'Avatar',
      description: 'Provider-specific avatar / character identifier.',
    }).pipe(FormInputAnnotation.set(false)),
  ),
  voiceId: Schema.optional(
    Schema.String.annotations({
      title: 'Voice',
      description: 'Provider-specific voice identifier.',
    }).pipe(FormInputAnnotation.set(false)),
  ),
  prompt: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
  url: Schema.optional(Schema.String.annotations({ title: 'URL' }).pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.generation',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--film-reel--regular',
    hue: 'fuchsia',
  }),
);

export interface Generation extends Schema.Schema.Type<typeof Generation> {}

export type MakeProps = Partial<{
  name: string;
  type: Kind;
  prompt: string;
  avatarId: string;
  voiceId: string;
}>;

/** Creates a Generation with an attached empty markdown Text prompt. */
export const make = ({ name, type = 'video', prompt = '', avatarId, voiceId }: MakeProps = {}): Generation => {
  const text = Text.make({ content: prompt });
  const generation = Obj.make(Generation, {
    name,
    type,
    avatarId,
    voiceId,
    prompt: Ref.make(text),
  });
  Obj.setParent(text, generation);
  return generation;
};

/** Type guard for Generation instances. */
export const instanceOf = (value: unknown): value is Generation => Obj.instanceOf(Generation, value);
