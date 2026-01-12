//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Label } from './translations';

const LAYOUT_PLUGIN = 'dxos.org/plugin/layout';

/**
 * Expected payload for layout actions.
 */
export namespace LayoutAction {
  export const UPDATE_LAYOUT = `${LAYOUT_PLUGIN}/action/update-layout`;

  /**
   * Generic layout action.
   */
  export class UpdateLayout extends Schema.TaggedClass<UpdateLayout>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.String.annotations({ description: 'The part of the layout to mutate.' }),
      subject: Schema.optional(Schema.Any.annotations({ description: 'The subject of the layout update.' })),
      options: Schema.optional(
        Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
          description: 'Additional options for the layout action.',
        }),
      ),
    }),
    output: Schema.Void,
  }) {}

  //
  // Common layout actions.
  //

  // NOTE: These are layout actions which are currently in common use.
  //  They constrain the generic layout action types to provide additional type safety.
  //  However, they all follow the same generic structure and intent id.
  //  This allows for plugins to update the layout without depending on a specific layout plugin.
  //  The expectation is that other norms other than these will emerge over time.

  export class SetLayoutMode extends Schema.TaggedClass<SetLayoutMode>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('mode').annotations({ description: 'Setting the layout mode.' }),
      subject: Schema.optional(
        Schema.String.annotations({ description: 'Item which is the subject of the new layout mode.' }),
      ),
      options: Schema.Union(
        Schema.Struct({ mode: Schema.String.annotations({ description: 'The new layout mode.' }) }),
        Schema.Struct({ revert: Schema.Boolean.annotations({ description: 'Revert to the previous layout mode.' }) }),
      ),
    }),
    output: Schema.Void,
  }) {}

  export class UpdateSidebar extends Schema.TaggedClass<UpdateSidebar>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('sidebar').annotations({ description: 'Updating the sidebar.' }),
      subject: Schema.optional(
        Schema.String.annotations({ description: 'URI of the component to display in the sidebar.' }),
      ),
      options: Schema.optional(
        Schema.Struct({
          state: Schema.Literal('closed', 'collapsed', 'expanded').annotations({
            description: 'Whether the sidebar is closed, collapsed, or expanded.',
          }),
        }),
      ),
    }),
    output: Schema.Void,
  }) {}

  export class UpdateComplementary extends Schema.TaggedClass<UpdateComplementary>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('complementary').annotations({ description: 'Updating the complementary sidebar.' }),
      subject: Schema.optional(
        Schema.String.annotations({ description: 'URI of the component to display in the complementary area.' }),
      ),
      options: Schema.optional(
        Schema.Struct({
          state: Schema.Literal('closed', 'collapsed', 'expanded').annotations({
            description: 'Whether the complementary sidebar is closed, collapsed, or expanded.',
          }),
        }),
      ),
    }),
    output: Schema.Void,
  }) {}

  export class UpdateDialog extends Schema.TaggedClass<UpdateDialog>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('dialog').annotations({ description: 'Updating the dialog.' }),
      subject: Schema.optional(
        Schema.String.annotations({ description: 'URI of the component to display in the dialog.' }),
      ),
      options: Schema.Struct({
        state: Schema.optional(Schema.Boolean.annotations({ description: 'Whether the dialog is open or closed.' })),
        type: Schema.optional(Schema.Literal('default', 'alert').annotations({ description: 'The type of dialog.' })),
        blockAlign: Schema.optional(
          Schema.Literal('start', 'center', 'end').annotations({ description: 'The alignment of the dialog.' }),
        ),
        overlayClasses: Schema.optional(
          Schema.String.annotations({ description: 'Additional classes for the dialog overlay.' }),
        ),
        overlayStyle: Schema.optional(
          Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
            description: 'Additional styles for the dialog overlay.',
          }),
        ),
        props: Schema.optional(
          Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
            description: 'Additional props for the dialog.',
          }),
        ),
      }),
    }),
    output: Schema.Void,
  }) {}

  export class UpdatePopover extends Schema.TaggedClass<UpdatePopover>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('popover').annotations({ description: 'Updating the popover.' }),
      subject: Schema.optional(
        Schema.Any.annotations({
          description: 'URI of the component to display in the popover or data to pass to the popover.',
        }),
      ),
      options: Schema.Struct({
        side: Schema.optional(
          Schema.Literal('top', 'right', 'bottom', 'left').annotations({ description: 'The side of the anchor.' }),
        ),
        state: Schema.optional(Schema.Boolean.annotations({ description: 'Whether the popover is open or closed.' })),
        props: Schema.optional(
          Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
            description: 'Additional props for the popover.',
          }),
        ),
      }).pipe(
        Schema.extend(
          Schema.Union(
            Schema.Struct({
              variant: Schema.Literal('virtual'),
              anchor: Schema.Any.annotations({ description: 'The DOM element to anchor the popover to.' }),
            }),
            Schema.Struct({
              variant: Schema.optional(Schema.Literal('react')),
              anchorId: Schema.String.annotations({
                description: 'An id that can be used to determine whether to render the anchor subcomponent.',
              }),
            }),
          ),
        ),
      ),
    }),
    output: Schema.Void,
  }) {}

  export const Toast = Schema.Struct({
    id: Schema.String.annotations({ description: 'The id of the toast.' }),
    title: Schema.optional(Label.annotations({ description: 'The title of the toast.' })),
    description: Schema.optional(Label.annotations({ description: 'The description of the toast.' })),
    icon: Schema.optional(Schema.String.annotations({ description: 'The icon of the toast.' })),
    duration: Schema.optional(Schema.Number.annotations({ description: 'The duration of the toast.' })),
    closeLabel: Schema.optional(Label.annotations({ description: 'The label of the close button.' })),
    actionLabel: Schema.optional(Label.annotations({ description: 'The label of the action button.' })),
    actionAlt: Schema.optional(Label.annotations({ description: 'The alt text of the action button.' })),
    onAction: Schema.optional(
      Schema.Any.annotations({ description: 'The action to perform when the action button is clicked.' }),
    ),
  });

  export interface Toast extends Omit<Schema.Schema.Type<typeof Toast>, 'onAction'> {
    onAction?: () => void;
  }

  export class AddToast extends Schema.TaggedClass<AddToast>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('toast').annotations({ description: 'Adding a toast.' }),
      subject: Toast.annotations({ description: 'The toast to add.' }),
    }),
    output: Schema.Void,
  }) {}

  export class SwitchWorkspace extends Schema.TaggedClass<SwitchWorkspace>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('workspace').annotations({ description: 'Switching the workspace.' }),
      subject: Schema.String.annotations({ description: 'The id of the workspace to switch to.' }),
    }),
    output: Schema.Void,
  }) {}

  export class RevertWorkspace extends Schema.TaggedClass<RevertWorkspace>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('workspace').annotations({ description: 'Switching the workspace.' }),
      options: Schema.Struct({
        revert: Schema.Literal(true).annotations({ description: 'Revert to the previous workspace.' }),
      }),
    }),
    output: Schema.Void,
  }) {}

  export class Open extends Schema.TaggedClass<Open>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('main').annotations({ description: 'Opening an item in the main content area.' }),
      subject: Schema.Array(Schema.String.annotations({ description: 'Ids of the items to open.' })),
      options: Schema.optional(
        Schema.Struct({
          state: Schema.optional(Schema.Literal(true).annotations({ description: 'The items are being added.' })),
          variant: Schema.optional(Schema.String.annotations({ description: 'The variant of the item to open.' })),
          key: Schema.optional(
            Schema.String.annotations({
              description: 'If provided, will replace item with a matching key (id prefix).',
            }),
          ),
          workspace: Schema.optional(Schema.String.annotations({ description: 'The workspace to open the items in.' })),
          scrollIntoView: Schema.optional(Schema.Boolean.annotations({ description: 'Scroll the items into view.' })),
          pivotId: Schema.optional(
            Schema.String.annotations({ description: 'The id of the item to place new items next to.' }),
          ),
          positioning: Schema.optional(
            Schema.Union(
              Schema.Literal('start').annotations({ description: 'The items are being added before the pivot item.' }),
              Schema.Literal('end').annotations({ description: 'The items are being added after the pivot item.' }),
            ),
          ),
        }),
      ),
    }),
    output: Schema.Void,
  }) {}

  export class Set extends Schema.TaggedClass<Set>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('main').annotations({ description: 'Setting items in the main content area.' }),
      subject: Schema.Array(Schema.String.annotations({ description: 'Ids of the items to set.' })),
      options: Schema.Struct({
        override: Schema.Literal(true).annotations({
          description: 'Override the current items in the main content area.',
        }),
      }),
    }),
    output: Schema.Void,
  }) {}

  export class Close extends Schema.TaggedClass<Close>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('main').annotations({ description: 'Closing items in the main content area.' }),
      subject: Schema.Array(Schema.String.annotations({ description: 'Ids of the items to close.' })),
      options: Schema.Struct({
        state: Schema.Literal(false).annotations({ description: 'The items are being removed.' }),
      }),
    }),
    output: Schema.Void,
  }) {}

  export class ScrollIntoView extends Schema.TaggedClass<ScrollIntoView>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('current').annotations({ description: 'Setting the current item' }),
      subject: Schema.optional(Schema.String.annotations({ description: 'The id of the item to set as current.' })),
      options: Schema.optional(
        Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
          description: 'Additional options for the scroll into view.',
        }),
      ),
    }),
    output: Schema.Void,
  }) {}

  export class Expose extends Schema.TaggedClass<Expose>()(UPDATE_LAYOUT, {
    input: Schema.Struct({
      part: Schema.Literal('navigation').annotations({ description: 'Exposing an item in the navigation area.' }),
      subject: Schema.String.annotations({ description: 'The id of the item to expose.' }),
    }),
    output: Schema.Void,
  }) {}
}
