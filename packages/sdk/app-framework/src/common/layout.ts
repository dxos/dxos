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
      part: S.Literal('mode').annotations({ description: 'Setting the layout mode.' }),
      subject: S.optional(S.String.annotations({ description: 'Item which is the subject of the new layout mode.' })),
      options: S.Union(
        S.Struct({ mode: S.String.annotations({ description: 'The new layout mode.' }) }),
        S.Struct({ revert: S.Boolean.annotations({ description: 'Revert to the previous layout mode.' }) }),
      ),
    }),
    output: S.Void,
  }) {}

  export class UpdateSidebar extends S.TaggedClass<UpdateSidebar>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('sidebar').annotations({ description: 'Updating the sidebar.' }),
      subject: S.optional(S.String.annotations({ description: 'URI of the component to display in the sidebar.' })),
      options: S.optional(
        S.Struct({
          state: S.Literal('closed', 'collapsed', 'expanded').annotations({
            description: 'Whether the sidebar is closed, collapsed, or expanded.',
          }),
        }),
      ),
    }),
    output: S.Void,
  }) {}

  export class UpdateComplementary extends S.TaggedClass<UpdateComplementary>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('complementary').annotations({ description: 'Updating the complementary sidebar.' }),
      subject: S.optional(
        S.String.annotations({ description: 'URI of the component to display in the complementary area.' }),
      ),
      options: S.optional(
        S.Struct({
          state: S.Literal('closed', 'collapsed', 'expanded').annotations({
            description: 'Whether the complementary sidebar is closed, collapsed, or expanded.',
          }),
        }),
      ),
    }),
    output: S.Void,
  }) {}

  export class UpdateDialog extends S.TaggedClass<UpdateDialog>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('dialog').annotations({ description: 'Updating the dialog.' }),
      subject: S.optional(S.String.annotations({ description: 'URI of the component to display in the dialog.' })),
      options: S.Struct({
        state: S.optional(S.Boolean.annotations({ description: 'Whether the dialog is open or closed.' })),
        blockAlign: S.optional(
          S.Literal('start', 'center').annotations({ description: 'The alignment of the dialog.' }),
        ),
        type: S.optional(S.Literal('default', 'alert').annotations({ description: 'The type of dialog.' })),
        props: S.optional(
          S.Record({ key: S.String, value: S.Any }).annotations({
            description: 'Additional props for the dialog.',
          }),
        ),
      }),
    }),
    output: S.Void,
  }) {}

  export class UpdatePopover extends S.TaggedClass<UpdatePopover>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('popover').annotations({ description: 'Updating the popover.' }),
      subject: S.optional(S.String.annotations({ description: 'URI of the component to display in the popover.' })),
      options: S.Struct({
        anchorId: S.String.annotations({ description: 'The id of the element to anchor the popover to.' }),
        state: S.optional(S.Boolean.annotations({ description: 'Whether the popover is open or closed.' })),
        props: S.optional(
          S.Record({ key: S.String, value: S.Any }).annotations({
            description: 'Additional props for the popover.',
          }),
        ),
      }),
    }),
    output: S.Void,
  }) {}

  export const Toast = S.Struct({
    id: S.String.annotations({ description: 'The id of the toast.' }),
    title: S.optional(Label.annotations({ description: 'The title of the toast.' })),
    description: S.optional(Label.annotations({ description: 'The description of the toast.' })),
    icon: S.optional(S.String.annotations({ description: 'The icon of the toast.' })),
    duration: S.optional(S.Number.annotations({ description: 'The duration of the toast.' })),
    closeLabel: S.optional(Label.annotations({ description: 'The label of the close button.' })),
    actionLabel: S.optional(Label.annotations({ description: 'The label of the action button.' })),
    actionAlt: S.optional(Label.annotations({ description: 'The alt text of the action button.' })),
    onAction: S.optional(
      S.Any.annotations({ description: 'The action to perform when the action button is clicked.' }),
    ),
  });

  export interface Toast extends Omit<S.Schema.Type<typeof Toast>, 'onAction'> {
    onAction?: () => void;
  }

  export class AddToast extends S.TaggedClass<AddToast>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('toast').annotations({ description: 'Adding a toast.' }),
      subject: Toast.annotations({ description: 'The toast to add.' }),
    }),
    output: S.Void,
  }) {}

  export class SwitchWorkspace extends S.TaggedClass<SwitchWorkspace>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('workspace').annotations({ description: 'Switching the workspace.' }),
      subject: S.String.annotations({ description: 'The id of the workspace to switch to.' }),
    }),
    output: S.Void,
  }) {}

  export class Open extends S.TaggedClass<Open>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('main').annotations({ description: 'Opening an item in the main content area.' }),
      subject: S.Array(S.String.annotations({ description: 'Ids of the items to open.' })),
      options: S.optional(
        S.Struct({
          state: S.optional(S.Literal(true).annotations({ description: 'The items are being added.' })),
          key: S.optional(
            S.String.annotations({ description: 'If provided, will replace item with a matching key (id prefix).' }),
          ),
          scrollIntoView: S.optional(S.Boolean.annotations({ description: 'Scroll the items into view.' })),
          pivotId: S.optional(S.String.annotations({ description: 'The id of the item to place new items next to.' })),
          positioning: S.optional(
            S.Union(
              S.Literal('start').annotations({ description: 'The items are being added before the pivot item.' }),
              S.Literal('end').annotations({ description: 'The items are being added after the pivot item.' }),
            ),
          ),
        }),
      ),
    }),
    output: S.Void,
  }) {}

  export class Set extends S.TaggedClass<Set>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('main').annotations({ description: 'Setting items in the main content area.' }),
      subject: S.Array(S.String.annotations({ description: 'Ids of the items to set.' })),
      options: S.Struct({
        override: S.Literal(true).annotations({ description: 'Override the current items in the main content area.' }),
      }),
    }),
    output: S.Void,
  }) {}

  export class Close extends S.TaggedClass<Close>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('main').annotations({ description: 'Closing items in the main content area.' }),
      subject: S.Array(S.String.annotations({ description: 'Ids of the items to close.' })),
      options: S.Struct({
        state: S.Literal(false).annotations({ description: 'The items are being removed.' }),
      }),
    }),
    output: S.Void,
  }) {}

  export class ScrollIntoView extends S.TaggedClass<ScrollIntoView>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('current').annotations({ description: 'Setting the current item' }),
      subject: S.optional(S.String.annotations({ description: 'The id of the item to set as current.' })),
      options: S.optional(
        S.Record({ key: S.String, value: S.Any }).annotations({
          description: 'Additional options for the scroll into view.',
        }),
      ),
    }),
    output: S.Void,
  }) {}

  export class Expose extends S.TaggedClass<Expose>()(UPDATE_LAYOUT, {
    input: S.Struct({
      part: S.Literal('navigation').annotations({ description: 'Exposing an item in the navigation area.' }),
      subject: S.String.annotations({ description: 'The id of the item to expose.' }),
    }),
    output: S.Void,
  }) {}
}
