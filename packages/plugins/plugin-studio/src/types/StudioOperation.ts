//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, DXN, JsonSchema, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import * as Frame from './Frame.ts';
import * as MediaArtifact from './MediaArtifact.ts';
import * as Storyboard from './Storyboard.ts';
import * as Variant from './Variant.ts';

/**
 * Generate variants for a MediaArtifact from its prompt and append them. Resolves the
 * `GenerationService` (by `artifact.kind`, then `provider` id, else the first for the kind),
 * resolves the provider's API key from the Connector-managed `AccessToken` via `CredentialsService`
 * when `service.source` is set, builds the request from the supplied `config` (which includes the
 * prompt), and appends a `Variant` per result (each recording its `config` + `Generation`).
 * For an asynchronous provider the pending `Variant` holds the in-flight `jobId`; pass `variant` to
 * resume awaiting it (no re-enqueue).
 */
export const Generate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.studio.generate'),
    name: 'Generate',
    description: 'Generate variants for a MediaArtifact from its prompt.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    artifact: Ref.Ref(MediaArtifact.MediaArtifact).annotate({
      description: 'Reference to the MediaArtifact whose prompt drives generation.',
    }),
    provider: Schema.optional(
      Schema.String.annotate({ description: 'GenerationService id; defaults to the first for the kind.' }),
    ),
    name: Schema.optional(
      Schema.String.annotate({ description: 'Human label for the produced variant (defaults from the prompt).' }),
    ),
    config: Schema.optional(
      Schema.Record(Schema.String, Schema.Unknown).annotate({
        description: 'Kind-specific request config (recorded on the produced variant).',
      }),
    ),
    variant: Schema.optional(
      Ref.Ref(Variant.Variant).annotate({
        description: 'Pending variant to resume (awaits its in-flight jobId; no re-enqueue).',
      }),
    ),
    count: Schema.optional(Schema.Number.annotate({ description: 'Number of variants to generate (default 1).' })),
  }),
  output: Schema.Struct({
    count: Schema.Number.annotate({ description: 'Number of variants appended.' }),
  }),
  services: [Database.Service, Capability.Service, Credential.CredentialsService],
});

/** A frame to append: the media artifact's kind, prompt and provider config. */
export const FrameInput = Schema.Struct({
  name: Schema.String.annotate({ description: 'Short title of the frame (shown in the storyboard).' }),
  kind: Schema.Literals(['image', 'video']).annotate({ description: 'Media kind the frame shows.' }),
  prompt: Schema.String.annotate({ description: 'Generation prompt describing the frame.' }),
  notes: Schema.optional(Schema.String.annotate({ description: 'Narration or director notes for the frame.' })),
  provider: Schema.optional(
    Schema.String.annotate({
      description: 'GenerationService id to use (from list-providers); defaults to the first for the kind.',
    }),
  ),
  config: Schema.optional(
    Schema.Record(Schema.String, Schema.Unknown).annotate({
      description: 'Extra provider config merged with the prompt (e.g. { model }); see the provider requestSchema.',
    }),
  ),
});
export interface FrameInput extends Schema.Schema.Type<typeof FrameInput> {}

/** What appending a frame yields: the frame, its artifact, and the config to generate it with. */
export const AppendedFrame = Schema.Struct({
  frame: Ref.Ref(Frame.Frame).annotate({ description: 'The appended frame.' }),
  artifact: Ref.Ref(MediaArtifact.MediaArtifact).annotate({ description: "The frame's media artifact, to generate." }),
  config: Schema.Record(Schema.String, Schema.Unknown).annotate({
    description: 'The request config to pass to generate for this artifact.',
  }),
  generated: Schema.optional(Schema.Number.annotate({ description: 'Variants produced when `generate` was set.' })),
});

/**
 * Create a {@link Storyboard}, optionally with its frames in one call, filed into a project's
 * artifacts when one is given so it appears where the task that asked for it lives.
 */
export const CreateStoryboard = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.studio.createStoryboard'),
    name: 'Create storyboard',
    icon: 'ph--film-strip--regular',
    description: trim`
      Creates a storyboard — an ordered sequence of frames, each showing one media artifact — with
      any frames given (each a name, kind, prompt and provider config, as append-frame takes).
      Pass the project you are working in so the storyboard is filed into its artifacts. Pass
      generate: true to produce every frame's media in the same call, else generate each frame's
      artifact afterwards (or append frames later with append-frame).
    `,
  },
  input: Schema.Struct({
    name: Schema.String.annotate({ description: 'Title of the storyboard.' }),
    project: Schema.optional(
      Ref.Ref(Project.Project).annotate({
        description: 'Project to file the storyboard into (from the chat context).',
      }),
    ),
    frames: Schema.optional(Schema.Array(FrameInput).annotate({ description: 'Frames to append, in order.' })),
    generate: Schema.optional(
      Schema.Boolean.annotate({ description: 'Generate every given frame in this call (slow for video).' }),
    ),
  }),
  output: Schema.Struct({
    storyboard: Ref.Ref(Storyboard.Storyboard).annotate({ description: 'The created storyboard.' }),
    frames: Schema.Array(AppendedFrame).annotate({ description: 'The appended frames, in order.' }),
  }),
  services: [Database.Service, Capability.Service, Credential.CredentialsService],
}).pipe(Operation.mutation('write'));

/**
 * Append a frame to a storyboard: makes the frame's media artifact (not yet generated), parented to
 * the frame, and appends the frame in sequence.
 */
export const AppendFrame = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.studio.appendFrame'),
    name: 'Append frame',
    icon: 'ph--frame-corners--regular',
    description: trim`
      Appends a frame to a storyboard. Creates the frame's media artifact (image or video) with the
      given prompt as its draft config; nothing is generated unless generate: true — else call
      generate on the returned artifact to produce it. Use list-providers first to learn which
      provider handles the kind and which extra config keys (e.g. a model) it needs.
    `,
  },
  input: Schema.Struct({
    storyboard: Ref.Ref(Storyboard.Storyboard).annotate({ description: 'The storyboard to append to.' }),
    ...FrameInput.fields,
    generate: Schema.optional(
      Schema.Boolean.annotate({
        description: 'Generate the frame immediately (one generate call with the returned config); slow for video.',
      }),
    ),
  }),
  output: AppendedFrame,
  services: [Database.Service, Capability.Service, Credential.CredentialsService],
}).pipe(Operation.mutation('write'));

export const ProviderInfo = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  label: Schema.String,
  requestSchema: JsonSchema.JsonSchema.annotate({ description: 'JSON schema of the config generate expects.' }),
  defaultRequest: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

/** List the registered generation providers so an agent can pick one and fill its config. */
export const ListProviders = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.studio.listProviders'),
    name: 'List providers',
    icon: 'ph--plugs--regular',
    description: trim`
      Lists the media generation providers available in this app: id, media kind (image/video), and
      the JSON schema of the config each expects from generate (the prompt plus provider keys such as
      a model). Call before append-frame / generate.
    `,
  },
  input: Schema.Struct({
    kind: Schema.optional(Schema.String.annotate({ description: 'Only providers for this kind.' })),
  }),
  output: Schema.Struct({
    providers: Schema.Array(ProviderInfo),
  }),
  services: [Capability.Service],
}).pipe(Operation.mutation('none'));
