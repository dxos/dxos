//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';

/** Media kind produced by a Generation. Video-only for now; an audio kind will return when there's a real audio provider. */
export const Kind = Schema.Literal('video');
export type Kind = Schema.Schema.Type<typeof Kind>;

/** Known provider identifiers. Matches `GenerationProvider.id`. */
export const ProviderId = Schema.Literal('heygen', 'gemini');
export type ProviderId = Schema.Schema.Type<typeof ProviderId>;

export const DEFAULT_PROVIDER: ProviderId = 'heygen';

/**
 * AI media generation artefact.
 * `prompt` is a ref to a markdown Text document the user edits inline.
 * `provider` selects which `GenerationProvider` services this clip; defaults
 * to `DEFAULT_PROVIDER` when missing (back-compat for phase-1 objects).
 * `urls` is a most-recent-first list of every completed generation for this
 * object — each successful `awaitResult` prepends. The article renders them
 * as a carousel so prior renders remain accessible.
 * `avatarId` / `voiceId` are provider-agnostic identifiers a GenerationProvider
 * may use when the underlying service supports them.
 * `jobId` holds the provider's in-flight job identifier between enqueue and
 * completion. It is set by the article after `provider.enqueue` and cleared
 * once `provider.awaitResult` returns a `url`; resuming on remount means a
 * crash or navigation away mid-job won't strand the user — the next mount
 * sees the stored id and continues polling.
 * `jobProvider` is snapshotted from `provider` when the job is enqueued so the
 * polling loop always talks to the backend that owns `jobId` even if the user
 * switches `provider` in the gear pane mid-flight.
 */
export const Generation = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  type: Kind.annotations({ title: 'Type' }),
  provider: Schema.optional(ProviderId.annotations({ title: 'Provider' })),
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
  urls: Schema.optional(
    Schema.Array(Schema.String).annotations({ title: 'URLs' }).pipe(FormInputAnnotation.set(false)),
  ),
  jobId: Schema.optional(Schema.String.annotations({ title: 'Job ID' }).pipe(FormInputAnnotation.set(false))),
  jobProvider: Schema.optional(ProviderId.annotations({ title: 'Job Provider' }).pipe(FormInputAnnotation.set(false))),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--film-reel--regular', hue: 'fuchsia' }),
  Type.makeObject(DXN.make('org.dxos.type.generation', '0.1.0')),
);

export type Generation = Type.InstanceType<typeof Generation>;

export type MakeProps = Partial<{
  name: string;
  type: Kind;
  provider: ProviderId;
  prompt: string;
  avatarId: string;
  voiceId: string;
}>;

/** Creates a Generation with an attached empty markdown Text prompt. */
export const make = ({
  name,
  type = 'video',
  provider = DEFAULT_PROVIDER,
  prompt = '',
  avatarId,
  voiceId,
}: MakeProps = {}): Generation => {
  const text = Text.make({ content: prompt });
  const generation = Obj.make(Generation, {
    name,
    type,
    provider,
    avatarId,
    voiceId,
    prompt: Ref.make(text),
  });
  Obj.setParent(text, generation);
  return generation;
};

/**
 * Returns the active provider id for a Generation, defaulting to `DEFAULT_PROVIDER`
 * when missing. Accepts a structural shape so it can be called with either the
 * live ECHO object or its snapshot returned by `useObject`.
 */
export const getProvider = (generation: { provider?: ProviderId }): ProviderId =>
  generation.provider ?? DEFAULT_PROVIDER;

/** Type guard for Generation instances. */
export const instanceOf = (value: unknown): value is Generation => Obj.instanceOf(Generation, value);
