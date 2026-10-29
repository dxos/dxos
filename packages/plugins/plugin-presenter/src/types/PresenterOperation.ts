//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';

import * as Presentation from './Presentation.ts';

export const SetPresenting = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.presenter.setPresenting'),
    name: 'Set Presenting',
    icon: 'ph--presentation--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    object: Schema.Union([Type.getSchema(Markdown.Document), Type.getSchema(Presentation.Presentation)]),
    // Required: absent used to mean "flip".
    state: Schema.Boolean,
  }),
  output: Schema.Void,
});

const Issues = Schema.Array(Schema.String).annotate({
  description:
    'Problems found in the slides (for example an unknown layout); when there are any, nothing was saved. Fix them and call again.',
});

export const CreatePresentation = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.presenter.createPresentation'),
    name: 'Create presentation',
    description: 'Creates a presentation from slides written in Slidev markdown and adds it to the space.',
    icon: 'ph--presentation--regular',
  },
  // The capability manager carries the `DefaultParent` rule that files the presentation into the root collection.
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    name: Schema.String.annotate({ description: 'The presentation name.' }),
    slides: Schema.Array(Schema.String).annotate({
      description:
        'One Slidev markdown string per slide, each with its own optional frontmatter; no `---` between slides.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.optional(Schema.String).annotate({
      description: 'The DXN of the created presentation; absent when there were issues and nothing was saved.',
    }),
    issues: Issues,
  }),
});

export const AddSection = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.presenter.addSection'),
    name: 'Add section',
    description:
      'Adds a slide to a presentation: new slide markdown, or a link to an existing object shown as a slide.',
    icon: 'ph--plus--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    presentation: Ref.Ref(Presentation.Presentation).annotate({ description: 'The presentation to add to.' }),
    content: Schema.optional(Schema.String).annotate({ description: 'Slidev markdown for a new slide.' }),
    object: Schema.optional(Ref.Ref(Obj.Unknown)).annotate({
      description: 'An existing object to link as a slide, instead of content.',
    }),
    index: Schema.optional(Schema.Number).annotate({
      description: 'Position of the new section; appends when absent.',
    }),
  }),
  output: Schema.Struct({ issues: Issues }),
});

export const ListLayouts = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.presenter.listLayouts'),
    name: 'List layouts',
    description: 'Lists the slide layouts, their slot markers, and the frontmatter keys a slide may use.',
    icon: 'ph--layout--regular',
  },
  input: Schema.Struct({}),
  output: Schema.Struct({
    layouts: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        slots: Schema.Array(Schema.String).annotate({
          description: 'The `::name::` markers that start each region after the first; empty for a single region.',
        }),
      }),
    ),
    frontmatter: Schema.Array(Schema.String).annotate({ description: 'Frontmatter keys a slide may set.' }),
  }),
});

export const PresentObject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.presenter.startPresenting'),
    name: 'Present',
    description: 'Presents a presentation (or a markdown document as a deck) fullscreen.',
    icon: 'ph--presentation--regular',
  },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    object: Ref.Ref(Obj.Unknown).annotate({ description: 'The presentation or markdown document to present.' }),
  }),
  output: Schema.Void,
});

export const GenerateSlideImage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.presenter.generateSlideImage'),
    name: 'Generate slide image',
    description:
      "Generates an image for a slide from a prompt and places it in the slide's layout (a markdown slide without an " +
      'image layout switches to `layout: image`). Returns the generated media artifact, or an error.',
    icon: 'ph--image--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    slide: Ref.Ref(Presentation.Slide).annotate({ description: 'The slide to give an image.' }),
    prompt: Schema.String.annotate({ description: 'What the image shows.' }),
    provider: Schema.optional(Schema.String).annotate({
      description: 'The image provider id; the first configured one when absent.',
    }),
  }),
  output: Schema.Struct({
    artifact: Ref.Ref(MediaArtifact.MediaArtifact),
    error: Schema.optional(Schema.String),
  }),
});
