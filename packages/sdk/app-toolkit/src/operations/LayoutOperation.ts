//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';
import { SelectionSchema } from '@dxos/react-ui-attention/types';

import { Translations } from '../app';

const LAYOUT_PLUGIN = 'org.dxos.plugin.layout';

//
// Sidebar Operations
//

export const UpdateSidebar = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.updateSidebar`),
    name: 'Update Sidebar',
    description: 'Update the sidebar state.',
    icon: 'ph--sidebar--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
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
});

export const UpdateComplementary = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.updateComplementary`),
    name: 'Update Complementary Sidebar',
    description: 'Update the complementary sidebar state.',
    icon: 'ph--sidebar--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
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
});

//
// Dialog Operations
//

export const UpdateDialog = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.updateDialog`),
    name: 'Update Dialog',
    description: 'Open, close, or update the dialog.',
    icon: 'ph--app-window--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
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
});

//
// Popover Operations
//

const PopoverBaseInput = Schema.Struct({
  subjectRef: Schema.optional(Schema.String.annotations({ description: 'The id of the subject.' })),
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

const PopoverBaseWithKind = Schema.Union(
  PopoverBaseInput.pipe(
    Schema.extend(
      Schema.Struct({
        kind: Schema.Literal('base').pipe(Schema.optional),
      }),
    ),
  ),
  PopoverBaseInput.pipe(
    Schema.extend(
      Schema.Struct({
        kind: Schema.Literal('card'),
        title: Schema.optional(Translations.Label.annotations({ description: 'The title of the card.' })),
      }),
    ),
  ),
  // A modal, focused popover anchored to a navtree row for inline rename.
  PopoverBaseInput.pipe(
    Schema.extend(
      Schema.Struct({
        kind: Schema.Literal('rename'),
      }),
    ),
  ),
);

export const UpdatePopover = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.updatePopover`),
    name: 'Update Popover',
    description: 'Open, close, or update a popover.',
    icon: 'ph--chat-text--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Union(
    PopoverBaseWithKind.pipe(
      Schema.extend(
        Schema.Struct({
          variant: Schema.Literal('virtual'),
          anchor: Schema.Any.annotations({ description: 'The DOM element to anchor the popover to.' }),
        }),
      ),
    ),
    PopoverBaseWithKind.pipe(
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
});

//
// Toast Operations
//

export const Toast = Schema.Struct({
  id: Schema.String.annotations({ description: 'The id of the toast.' }),
  title: Schema.optional(Translations.Label.annotations({ description: 'The title of the toast.' })),
  description: Schema.optional(Translations.Label.annotations({ description: 'The description of the toast.' })),
  icon: Schema.optional(Schema.String.annotations({ description: 'The icon of the toast.' })),
  duration: Schema.optional(Schema.Number.annotations({ description: 'The duration of the toast.' })),
  closeLabel: Schema.optional(Translations.Label.annotations({ description: 'The label of the close button.' })),
  actionLabel: Schema.optional(Translations.Label.annotations({ description: 'The label of the action button.' })),
  actionAlt: Schema.optional(Translations.Label.annotations({ description: 'The alt text of the action button.' })),
  onAction: Schema.optional(
    Schema.Any.annotations({ description: 'The action to perform when the action button is clicked.' }),
  ),
});

export interface Toast extends Omit<Schema.Schema.Type<typeof Toast>, 'onAction'> {
  onAction?: () => void;
}

/**
 * Structured override for the toast shown when a process fails. A failing operation carries it as
 * `context.notifyOverride` on its error (built with {@link setNotifyOverride}); the notification
 * tracker reads it back from the process's raw failure with {@link getNotifyOverride} and renders it
 * in place of the default title + `Cause.pretty` dump. Every field is plain serializable data —
 * the override rides on an error across the process failure boundary — so the click action is a
 * {@link Operation.SerializedInvocation} the tracker runs via its own invoker, not a live callback.
 */
export interface NotifyOverride {
  readonly title?: Translations.Label;
  readonly description?: Translations.Label;
  readonly actionLabel?: Translations.Label;
  /** Accessibility alt text for the action button; defaults to `actionLabel` when omitted. */
  readonly actionAlt?: Translations.Label;
  /** Operation invoked when the toast's action button is clicked. */
  readonly action?: Operation.SerializedInvocation;
}

/**
 * Builds the `context` fragment an error merges in (e.g. `context: { ...setNotifyOverride(o), … }`) to
 * set its {@link NotifyOverride} — the counterpart to {@link getNotifyOverride}, so the
 * `notifyOverride` key is only ever spelled in one place.
 */
export const setNotifyOverride = (override: NotifyOverride): { notifyOverride: NotifyOverride } => ({
  notifyOverride: override,
});

/** Extracts a {@link NotifyOverride} from a process's raw failure value (`Process.Info.failure`), if present. */
export const getNotifyOverride = (failure: unknown): NotifyOverride | null => {
  if (!Predicate.isRecord(failure) || !Predicate.isRecord(failure.context)) {
    return null;
  }
  const override = failure.context.notifyOverride;
  // `context` is an untyped bag on a foreign error value; `Predicate.isRecord` is the only structural
  // check available at this boundary, so the field shape beyond "is a record" can't be verified.
  return Predicate.isRecord(override) ? (override as NotifyOverride) : null;
};

export const AddToast = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.addToast`),
    name: 'Add Toast',
    description: 'Add a toast notification.',
    icon: 'ph--broadcast--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Toast,
  output: Schema.Void,
});

//
// Layout Mode Operations
//

export const SetLayoutMode = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.setLayoutMode`),
    name: 'Set Layout Mode',
    description: 'Set the layout mode (solo, deck, fullscreen, etc.).',
    icon: 'ph--layout--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
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
});

//
// Workspace Operations
//

export const SwitchWorkspace = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.switchWorkspace`),
    name: 'Switch Workspace',
    description: 'Switch to a different workspace.',
    icon: 'ph--arrows-clockwise--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.String.annotations({ description: 'The id of the workspace to switch to.' }),
  }),
  output: Schema.Void,
});

export const RevertWorkspace = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.revertWorkspace`),
    name: 'Revert Workspace',
    description: 'Revert to the previous workspace.',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

//
// Main Content Operations
//

const NavigationMode = Schema.Literal('immediate', 'validate');

export const Open = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.open`),
    name: 'Open',
    description: 'Open items in the main content area. Takes navigation paths as subjects.',
    icon: 'ph--arrow-square-out--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    // TODO(dmaretskyi): use Ref.Ref(Obj.Unknown)
    subject: Schema.Array(
      Schema.String.annotations({
        description: 'Navigation paths of the items to open.',
      }),
    ),
    state: Schema.optional(Schema.Literal(true).annotations({ description: 'The items are being added.' })),
    variant: Schema.optional(Schema.String.annotations({ description: 'The variant of the item to open.' })),
    key: Schema.optional(
      Schema.String.annotations({
        description: 'If provided, will replace item with a matching key (id prefix).',
      }),
    ),
    workspace: Schema.optional(Schema.String.annotations({ description: 'The workspace to open the items in.' })),
    scrollIntoView: Schema.optional(Schema.Boolean.annotations({ description: 'Scroll the items into view.' })),
    navigation: Schema.optional(
      NavigationMode.annotations({
        description:
          'How navigation should resolve the requested path. Use validate (the default) to check the path exists before navigating. Immediate is for internal use only.',
      }),
    ),
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
  output: Schema.Array(Schema.String).annotations({ description: 'The resolved navigation paths that were opened.' }),
});

export const Close = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.close`),
    name: 'Close',
    description: 'Close items in the main content area.',
    icon: 'ph--x--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.Array(Schema.String.annotations({ description: 'Ids of the items to close.' })),
  }),
  output: Schema.Void,
});

export const Set = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.set`),
    name: 'Set',
    description: 'Override items in the main content area.',
    icon: 'ph--layout--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.Array(Schema.String.annotations({ description: 'Ids of the items to set.' })),
  }),
  output: Schema.Void,
});

//
// Navigation Operations
//

export const ScrollIntoView = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.scrollIntoView`),
    name: 'Scroll Into View',
    description: 'Scroll an item into view.',
    icon: 'ph--eye--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.optional(Schema.String.annotations({ description: 'The id of the item to scroll into view.' })),
    cursor: Schema.optional(Schema.String.annotations({ description: 'A cursor to scroll to within the item.' })),
    ref: Schema.optional(Schema.String.annotations({ description: 'A reference id for the scroll target.' })),
  }),
  output: Schema.Void,
});

export const Expose = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.expose`),
    name: 'Expose',
    description: 'Expose an item in the navigation area.',
    icon: 'ph--eye--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.String.annotations({ description: 'The id of the item to expose.' }),
  }),
  output: Schema.Void,
});

//
// Companion Operations
//

export const UpdateCompanion = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.updateCompanion`),
    name: 'Update Companion',
    description: 'Update the companion plank for a primary plank.',
    icon: 'ph--sidebar--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.Union(Schema.String, Schema.Null),
  }),
  output: Schema.Void,
});

//
// Selection Operations
//

export const Select = Operation.make({
  meta: {
    key: DXN.make(`${LAYOUT_PLUGIN}.operation.select`),
    name: 'Select',
    description: 'Select items in an attention context.',
    icon: 'ph--check--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    contextId: Schema.String.annotations({ description: 'The id of the attention context.' }),
    subject: SelectionSchema.annotations({ description: 'The selection to apply.' }),
  }),
  output: Schema.Void,
});
