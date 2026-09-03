//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';

/**
 * Fills the document with placeholder prose from the slash menu — the cheapest way to get a
 * realistic amount of text in front of a layout or scrolling bug.
 */
export const InsertLoremIpsum = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.debug.insertLoremIpsum'),
    name: 'Lorem ipsum',
    description: 'Inserts a paragraph of placeholder text at the cursor.',
    icon: 'ph--text-align-left--regular',
  },
  input: MarkdownOperation.EditorCommandInput,
  output: Schema.Void,
  // The handler resolves the live EditorView from a capability, which is the only route from the
  // operation layer to the editor.
  services: [Capability.Service],
});

const LayoutSummary = Schema.Struct({
  mode: Schema.String,
  sidebarOpen: Schema.Boolean,
  complementarySidebarOpen: Schema.Boolean,
  dialogOpen: Schema.Boolean,
  workspace: Schema.String,
  active: Schema.Array(Schema.String).annotate({
    description: 'Graph path ids of the open planks — the ids layout open/close operations accept.',
  }),
  inactive: Schema.Array(Schema.String),
  scrollIntoView: Schema.optional(Schema.String),
});

const SubjectSummary = Schema.Struct({
  id: Schema.optional(Schema.String),
  dxn: Schema.optional(Schema.String),
  typename: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
});

const ActionSummary = Schema.Struct({
  id: Schema.String,
  label: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  disabled: Schema.optional(Schema.Boolean),
  operation: Schema.optional(Schema.String).annotate({
    description: 'Operation DXN embedded in the action id — invokable via the operation invoker.',
  }),
  group: Schema.optional(Schema.Boolean),
});

const PlankSummary = Schema.Struct({
  id: Schema.String,
  label: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
  subject: Schema.optional(SubjectSummary),
  actions: Schema.Array(ActionSummary),
});

const SurfaceSummary = Schema.Struct({
  id: Schema.optional(Schema.String),
  role: Schema.optional(Schema.String),
  component: Schema.optional(Schema.String),
});

/**
 * One JSON document describing the live UI state — layout, attention, open planks with their
 * subjects and reachable actions, mounted surfaces, and plugin counts — so an agent can infer what
 * the user sees and what it can do without screenshots. See app-framework/docs/INTROSPECTION.md.
 */
export const Snapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.debug.snapshot'),
    name: 'UI Snapshot',
    description:
      'Returns a JSON snapshot of the live UI state: layout (mode, sidebars, open planks), attended ' +
      'items, each open plank with its subject object and the actions the UI offers for it (with ' +
      'their operation keys), the mounted surfaces, and plugin counts. Read-only.',
    icon: 'ph--camera--regular',
  },
  services: [Capability.Service, Plugin.Service],
  input: Schema.Struct({}),
  output: Schema.Struct({
    layout: Schema.optional(LayoutSummary),
    attention: Schema.Array(Schema.String),
    planks: Schema.Array(PlankSummary),
    surfaces: Schema.Array(SurfaceSummary),
    plugins: Schema.Struct({
      installed: Schema.Number,
      enabled: Schema.Number,
      active: Schema.Number,
    }),
  }),
}).pipe(Operation.mutation('none'));

const SampleSpaceSummary = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  description: Schema.optional(Schema.String),
});

/**
 * Fills a space with one of the themed sample data sets plugins contribute, so an agent driving the
 * debug port can seed a realistic space without clicking through the generator panel.
 */
export const CreateSampleSpace = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.debug.createSampleSpace'),
    name: 'Create Sample Space',
    description:
      'Creates a new space and fills it with a themed sample data set. Call without `id` to list ' +
      'what is available without creating anything; the listing is the only way to learn the ids.',
    icon: 'ph--dice-five--regular',
  },
  // The contributing modules are demand-gated, so the handler fires the activation event itself.
  services: [Capability.Service, Plugin.Service],
  input: Schema.Struct({
    id: Schema.optional(Schema.String).annotate({
      description: 'Sample space id. Omit to list the available sets without creating anything.',
    }),
  }),
  output: Schema.Struct({
    applied: Schema.optional(SampleSpaceSummary).annotate({
      description: 'The set that was written; absent when listing.',
    }),
    spaceId: Schema.optional(Schema.String),
    subject: Schema.optional(Schema.Array(Schema.String)).annotate({
      description: 'Navigation path of the new space, for a follow-up open.',
    }),
    available: Schema.Array(SampleSpaceSummary),
  }),
}).pipe(Operation.mutation('write'));
