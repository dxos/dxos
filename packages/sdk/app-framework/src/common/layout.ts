//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { Label } from '../plugin-intent';

export const LAYOUT_PLUGIN = 'dxos.org/plugin/layout';
export const LAYOUT_ACTION = `${LAYOUT_PLUGIN}/action`;

/**
 * Expected payload for layout actions.
 */
export namespace LayoutAction {
  export const UPDATE_LAYOUT = `${LAYOUT_ACTION}/update-layout`;

  /**
   * Generic layout action.
   */
  export class UpdateLayout extends S.TaggedClass<UpdateLayout>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.String.annotations({ description: 'The part of the layout to mutate.' }),
      subject: S.optional(S.Any.annotations({ description: 'The subject of the layout update.' })),
      options: S.optional(
        S.Record({ key: S.String, value: S.Any }).annotations({
          description: 'Additional options for the layout action.',
        }),
      ),
    }),
    output: S.Void,
  }) {}

  //
  // Common layout actions.
  //

  // NOTE: These are layout actions which are currently in common use.
  //  They constrain the generic layout action types to provide additional type safety.
  //  However, they all follow the same generic structure and intent id.
  //  This allows for plugins to update the layout without depending on a specific layout plugin.
  //  The expectation is that other norms other than these will emerge over time.

  export class SetLayoutMode extends S.TaggedClass<SetLayoutMode>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('mode'),
      subject: S.optional(S.String),
      options: S.Union(S.Struct({ mode: S.String }), S.Struct({ revert: S.Boolean })),
    }),
    output: S.Void,
  }) {}

  export class UpdateSidebar extends S.TaggedClass<UpdateSidebar>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('sidebar'),
      subject: S.optional(S.String),
      options: S.optional(
        S.Struct({
          state: S.Boolean,
        }),
      ),
    }),
    output: S.Void,
  }) {}

  export class UpdateComplementary extends S.TaggedClass<UpdateComplementary>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('complementary'),
      subject: S.optional(S.String),
      options: S.optional(
        S.Struct({
          state: S.Boolean,
        }),
      ),
    }),
    output: S.Void,
  }) {}

  export class UpdateDialog extends S.TaggedClass<UpdateDialog>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('dialog'),
      subject: S.optional(S.String.annotations({ description: 'URI of the component to display in the dialog.' })),
      options: S.Struct({
        state: S.optional(S.Boolean),
        blockAlign: S.optional(S.Literal('start', 'center')),
        type: S.optional(S.Literal('default', 'alert')),
        props: S.optional(S.Record({ key: S.String, value: S.Any })),
      }),
    }),
    output: S.Void,
  }) {}

  export class UpdatePopover extends S.TaggedClass<UpdatePopover>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('popover'),
      subject: S.optional(S.String.annotations({ description: 'URI of the component to display in the popover.' })),
      options: S.Struct({
        anchorId: S.String,
        state: S.optional(S.Boolean),
        props: S.optional(S.Record({ key: S.String, value: S.Any })),
      }),
    }),
    output: S.Void,
  }) {}

  export const Toast = S.Struct({
    id: S.String,
    title: S.optional(Label),
    description: S.optional(Label),
    icon: S.optional(S.String),
    duration: S.optional(S.Number),
    closeLabel: S.optional(Label),
    actionLabel: S.optional(Label),
    actionAlt: S.optional(Label),
    onAction: S.optional(S.Any),
  });

  export interface Toast extends Omit<S.Schema.Type<typeof Toast>, 'onAction'> {
    onAction?: () => void;
  }

  export class AddToast extends S.TaggedClass<AddToast>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('toast'),
      subject: Toast,
    }),
    output: S.Void,
  }) {}

  export class Open extends S.TaggedClass<Open>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('main'),
      subject: S.Array(S.String),
      options: S.optional(
        S.Struct({
          scrollIntoView: S.optional(S.Boolean),
          pivotId: S.optional(S.String),
          positioning: S.optional(S.Literal('start', 'end')),
        }),
      ),
    }),
    output: S.Void,
  }) {}

  export class Set extends S.TaggedClass<Set>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('main'),
      subject: S.Array(S.String),
      options: S.Struct({
        override: S.Literal(true),
      }),
    }),
    output: S.Void,
  }) {}

  export class Close extends S.TaggedClass<Close>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('main'),
      subject: S.Array(S.String),
      options: S.Struct({
        state: S.Literal(false),
      }),
    }),
    output: S.Void,
  }) {}

  export class ScrollIntoView extends S.TaggedClass<ScrollIntoView>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('current'),
      subject: S.optional(S.String),
      options: S.optional(S.Record({ key: S.String, value: S.Any })),
    }),
    output: S.Void,
  }) {}

  export class Expose extends S.TaggedClass<Expose>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('navigation'),
      subject: S.String,
    }),
    output: S.Void,
  }) {}
}
