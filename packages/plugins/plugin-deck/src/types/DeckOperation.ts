//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

const PartAdjustmentSchema = Schema.Union([
  Schema.Literal('close').annotate({ description: 'Close the plank.' }),
  Schema.Literal('companion').annotate({ description: 'Open the companion plank side-by-side.' }),
  Schema.Literal('fullscreen').annotate({ description: 'Toggle fullscreen display of the plank.' }),
  Schema.Literal('expand').annotate({
    description: "Toggle the plank filling the deck, leaving only the other planks' spines beside it.",
  }),
  Schema.Literal('increment-start').annotate({ description: 'Move the plank towards the start of the deck.' }),
  Schema.Literal('increment-end').annotate({ description: 'Move the plank towards the end of the deck.' }),
]);

export type PartAdjustment = Schema.Schema.Type<typeof PartAdjustmentSchema>;

/**
 * Project a URL that arrived from outside the app: boot, a history traversal, or a deep link.
 *
 * An operation so the process runtime supplies the services its handler needs. The alternative is a
 * DOM event listener threading them by hand, and a `popstate` listener has no Effect context of its
 * own to take them from.
 */
export const HandleExternalUrl = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.deck.handleExternalUrl'),
    name: 'Handle External URL',
    description: 'Project a URL the app was navigated to from outside into the deck.',
    icon: 'ph--link--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service, Plugin.Service],
  input: Schema.Struct({
    url: Schema.optional(
      Schema.String.annotate({ description: 'The URL to project; defaults to the current address bar.' }),
    ),
  }),
  output: Schema.Void,
});

export const Adjust = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.deck.adjust'),
    name: 'Adjust',
    description: 'Adjust the layout of a plank.',
    icon: 'ph--layout--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    id: Schema.String.annotate({ description: 'The id of the plank to adjust.' }),
    type: PartAdjustmentSchema.annotate({ description: 'The type of adjustment to make.' }),
  }),
  output: Schema.Void,
});

export const UpdatePlankSize = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.deck.updatePlankSize'),
    name: 'Update Plank Size',
    description: 'Update the size of a plank.',
    icon: 'ph--arrows-out--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    id: Schema.String.annotate({ description: 'The id of the plank to resize.' }),
    size: Schema.Number.annotate({ description: 'The new size of the plank.' }),
  }),
  output: Schema.Void,
});

export const SetExpose = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.deck.setExpose'),
    name: 'Set Exposé',
    description: 'Show every plank at once as shrunk-to-fit tiles, or return to the deck.',
    icon: 'ph--squares-four--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    // Required: an absent value used to mean "flip", making the result depend on state the caller
    // had not read.
    expose: Schema.Boolean,
  }),
  output: Schema.Void,
});

export const UpdatePlankSizes = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.deck.updatePlankSizes'),
    name: 'Update Plank Sizes',
    description: 'Update the sizes of several planks at once.',
    icon: 'ph--arrows-out--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    // Applied in one update, so a split whose panes trade width never renders a frame with one pane
    // resized and the other not.
    sizes: Schema.Record(Schema.String, Schema.Number).annotate({
      description: 'New sizes, keyed by plank id.',
    }),
  }),
  output: Schema.Void,
});
