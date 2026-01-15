//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

import { Label } from './translations';

const LAYOUT_PLUGIN = 'dxos.org/plugin/layout';

/**
 * Layout operations - Operation-based equivalents of LayoutAction intents.
 * These mirror the LayoutAction namespace but use the Operation pattern.
 */
export namespace LayoutOperation {
  //
  // Sidebar Operations
  //

  export const UpdateSidebar = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/update-sidebar`,
      name: 'Update Sidebar',
      description: 'Update the sidebar state.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Struct({
        subject: Schema.optional(
          Schema.String.annotations({ description: 'URI of the component to display in the sidebar.' }),
        ),
        state: Schema.optional(
          Schema.Literal('closed', 'collapsed', 'expanded').annotations({
            description: 'Whether the sidebar is closed, collapsed, or expanded.',
          }),
        ),
      }),
      output: Schema.Void,
    },
  });

  export const UpdateComplementary = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/update-complementary`,
      name: 'Update Complementary Sidebar',
      description: 'Update the complementary sidebar state.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Struct({
        subject: Schema.optional(
          Schema.String.annotations({ description: 'URI of the component to display in the complementary area.' }),
        ),
        state: Schema.optional(
          Schema.Literal('closed', 'collapsed', 'expanded').annotations({
            description: 'Whether the complementary sidebar is closed, collapsed, or expanded.',
          }),
        ),
      }),
      output: Schema.Void,
    },
  });

  //
  // Dialog Operations
  //

  export const UpdateDialog = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/update-dialog`,
      name: 'Update Dialog',
      description: 'Open, close, or update the dialog.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Struct({
        subject: Schema.optional(
          Schema.String.annotations({ description: 'URI of the component to display in the dialog.' }),
        ),
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
      output: Schema.Void,
    },
  });

  //
  // Popover Operations
  //

  const PopoverBaseInput = Schema.Struct({
    subject: Schema.optional(
      Schema.Any.annotations({
        description: 'URI of the component to display in the popover or data to pass to the popover.',
      }),
    ),
    side: Schema.optional(
      Schema.Literal('top', 'right', 'bottom', 'left').annotations({ description: 'The side of the anchor.' }),
    ),
    state: Schema.optional(Schema.Boolean.annotations({ description: 'Whether the popover is open or closed.' })),
    props: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
        description: 'Additional props for the popover.',
      }),
    ),
  });

  export const UpdatePopover = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/update-popover`,
      name: 'Update Popover',
      description: 'Open, close, or update a popover.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Union(
        PopoverBaseInput.pipe(
          Schema.extend(
            Schema.Struct({
              variant: Schema.Literal('virtual'),
              anchor: Schema.Any.annotations({ description: 'The DOM element to anchor the popover to.' }),
            }),
          ),
        ),
        PopoverBaseInput.pipe(
          Schema.extend(
            Schema.Struct({
              variant: Schema.optional(Schema.Literal('react')),
              anchorId: Schema.String.annotations({
                description: 'An id that can be used to determine whether to render the anchor subcomponent.',
              }),
            }),
          ),
        ),
      ),
      output: Schema.Void,
    },
  });

  //
  // Toast Operations
  //

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

  export const AddToast = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/add-toast`,
      name: 'Add Toast',
      description: 'Add a toast notification.',
    },
    executionMode: 'sync',
    schema: {
      input: Toast,
      output: Schema.Void,
    },
  });

  //
  // Layout Mode Operations
  //

  export const SetLayoutMode = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/set-layout-mode`,
      name: 'Set Layout Mode',
      description: 'Set the layout mode (solo, deck, fullscreen, etc.).',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Union(
        Schema.Struct({
          subject: Schema.optional(
            Schema.String.annotations({ description: 'Item which is the subject of the new layout mode.' }),
          ),
          mode: Schema.String.annotations({ description: 'The new layout mode.' }),
        }),
        Schema.Struct({
          revert: Schema.Boolean.annotations({ description: 'Revert to the previous layout mode.' }),
        }),
      ),
      output: Schema.Void,
    },
  });

  //
  // Workspace Operations
  //

  export const SwitchWorkspace = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/switch-workspace`,
      name: 'Switch Workspace',
      description: 'Switch to a different workspace.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Struct({
        subject: Schema.String.annotations({ description: 'The id of the workspace to switch to.' }),
      }),
      output: Schema.Void,
    },
  });

  export const RevertWorkspace = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/revert-workspace`,
      name: 'Revert Workspace',
      description: 'Revert to the previous workspace.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Void,
      output: Schema.Void,
    },
  });

  //
  // Main Content Operations
  //

  export const Open = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/open`,
      name: 'Open',
      description: 'Open items in the main content area.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Struct({
        subject: Schema.Array(Schema.String.annotations({ description: 'Ids of the items to open.' })),
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
      output: Schema.Void,
    },
  });

  export const Close = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/close`,
      name: 'Close',
      description: 'Close items in the main content area.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Struct({
        subject: Schema.Array(Schema.String.annotations({ description: 'Ids of the items to close.' })),
      }),
      output: Schema.Void,
    },
  });

  export const Set = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/set`,
      name: 'Set',
      description: 'Override items in the main content area.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Struct({
        subject: Schema.Array(Schema.String.annotations({ description: 'Ids of the items to set.' })),
      }),
      output: Schema.Void,
    },
  });

  //
  // Navigation Operations
  //

  export const ScrollIntoView = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/scroll-into-view`,
      name: 'Scroll Into View',
      description: 'Scroll an item into view.',
    },
    schema: {
      input: Schema.Struct({
        subject: Schema.optional(Schema.String.annotations({ description: 'The id of the item to scroll into view.' })),
        cursor: Schema.optional(Schema.String.annotations({ description: 'A cursor to scroll to within the item.' })),
        ref: Schema.optional(Schema.String.annotations({ description: 'A reference id for the scroll target.' })),
      }),
      output: Schema.Void,
    },
  });

  export const Expose = Operation.make({
    meta: {
      key: `${LAYOUT_PLUGIN}/operation/expose`,
      name: 'Expose',
      description: 'Expose an item in the navigation area.',
    },
    schema: {
      input: Schema.Struct({
        subject: Schema.String.annotations({ description: 'The id of the item to expose.' }),
      }),
      output: Schema.Void,
    },
  });
}

const UNDO_NAMESPACE = 'dxos.org/app-framework/undo';

/**
 * Operations related to undo/history functionality.
 */
export namespace UndoOperation {
  /**
   * Show an undo toast notification.
   * Fired by HistoryTracker when an undoable operation is tracked.
   */
  export const ShowUndo = Operation.make({
    meta: {
      key: `${UNDO_NAMESPACE}/operation/show-undo`,
      name: 'Show Undo',
      description: 'Show an undo toast notification.',
    },
    executionMode: 'sync',
    schema: {
      input: Schema.Struct({
        message: Schema.optional(Label.annotations({ description: 'The message to display in the undo toast.' })),
      }),
      output: Schema.Void,
    },
  });
}
