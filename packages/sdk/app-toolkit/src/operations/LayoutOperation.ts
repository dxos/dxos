//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';
import { Selection } from '@dxos/react-ui-attention/types';

import { Translations } from '../app';

const LAYOUT_PLUGIN = 'org.dxos.plugin.layout';

//
// Sidebar Operations
//

export const UpdateSidebar = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.updateSidebar'),
    name: 'Update Sidebar',
    description: 'Update the sidebar state.',
    icon: 'ph--sidebar--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.optional(
      Schema.String.annotate({ description: 'URI of the component to display in the sidebar.' }),
    ),
    state: Schema.optional(
      Schema.Literals(['closed', 'collapsed', 'expanded']).annotate({
        description: 'Whether the sidebar is closed, collapsed, or expanded.',
      }),
    ),
  }),
  output: Schema.Void,
});

export const UpdateComplementary = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.updateComplementary'),
    name: 'Update Complementary Sidebar',
    description: 'Update the complementary sidebar state.',
    icon: 'ph--sidebar--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.optional(
      Schema.String.annotate({ description: 'URI of the component to display in the complementary area.' }),
    ),
    state: Schema.optional(
      Schema.Literals(['closed', 'collapsed', 'expanded']).annotate({
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
    key: DXN.make('org.dxos.operation.appToolkit.updateDialog'),
    name: 'Update Dialog',
    description: 'Open, close, or update the dialog.',
    icon: 'ph--app-window--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.optional(Schema.String.annotate({ description: 'URI of the component to display in the dialog.' })),
    state: Schema.optional(Schema.Boolean.annotate({ description: 'Whether the dialog is open or closed.' })),
    type: Schema.optional(Schema.Literals(['default', 'alert']).annotate({ description: 'The type of dialog.' })),
    blockAlign: Schema.optional(
      Schema.Literals(['start', 'center', 'end']).annotate({ description: 'The alignment of the dialog.' }),
    ),
    overlayClasses: Schema.optional(
      Schema.String.annotate({ description: 'Additional classes for the dialog overlay.' }),
    ),
    overlayStyle: Schema.optional(
      Schema.Record(Schema.String, Schema.Any).annotate({
        description: 'Additional styles for the dialog overlay.',
      }),
    ),
    props: Schema.optional(
      Schema.Record(Schema.String, Schema.Any).annotate({
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
  subjectRef: Schema.optional(Schema.String.annotate({ description: 'The id of the subject.' })),
  subject: Schema.optional(
    Schema.Any.annotate({
      description: 'URI of the component to display in the popover or data to pass to the popover.',
    }),
  ),
  side: Schema.optional(
    Schema.Literals(['top', 'right', 'bottom', 'left']).annotate({ description: 'The side of the anchor.' }),
  ),
  state: Schema.optional(Schema.Boolean.annotate({ description: 'Whether the popover is open or closed.' })),
  props: Schema.optional(
    Schema.Record(Schema.String, Schema.Any).annotate({
      description: 'Additional props for the popover.',
    }),
  ),
});

// Effect 4 dropped `Schema.extend`; its replacement takes fields rather than schemas, so the
// per-kind and per-variant additions are declared as field records and spread onto the base. The
// union is written out because a popover is a kind *and* a variant -- v3's `extend` over a union
// distributed the same six members.
const popoverKindFields = {
  base: {
    kind: Schema.Literal('base').pipe(Schema.optional),
  },
  card: {
    kind: Schema.Literal('card'),
    title: Schema.optional(Translations.Label.annotate({ description: 'The title of the card.' })),
  },
  // A modal, focused popover anchored to a navtree row for inline rename.
  rename: {
    kind: Schema.Literal('rename'),
  },
} as const;

const popoverVariantFields = {
  virtual: {
    variant: Schema.Literal('virtual'),
    anchor: Schema.Any.annotate({ description: 'The DOM element to anchor the popover to.' }),
  },
  react: {
    variant: Schema.optional(Schema.Literal('react')),
    anchorId: Schema.String.annotate({
      description: 'An id that can be used to determine whether to render the anchor subcomponent.',
    }),
  },
} as const;

export const UpdatePopover = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.updatePopover'),
    name: 'Update Popover',
    description: 'Open, close, or update a popover.',
    icon: 'ph--chat-text--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Union([
    Schema.Struct({ ...PopoverBaseInput.fields, ...popoverKindFields.base, ...popoverVariantFields.virtual }),
    Schema.Struct({ ...PopoverBaseInput.fields, ...popoverKindFields.card, ...popoverVariantFields.virtual }),
    Schema.Struct({ ...PopoverBaseInput.fields, ...popoverKindFields.rename, ...popoverVariantFields.virtual }),
    Schema.Struct({ ...PopoverBaseInput.fields, ...popoverKindFields.base, ...popoverVariantFields.react }),
    Schema.Struct({ ...PopoverBaseInput.fields, ...popoverKindFields.card, ...popoverVariantFields.react }),
    Schema.Struct({ ...PopoverBaseInput.fields, ...popoverKindFields.rename, ...popoverVariantFields.react }),
  ]),
  output: Schema.Void,
});

//
// Toast Operations
//

export const Toast = Schema.Struct({
  id: Schema.String.annotate({ description: 'The id of the toast.' }),
  title: Schema.optional(Translations.Label.annotate({ description: 'The title of the toast.' })),
  description: Schema.optional(Translations.Label.annotate({ description: 'The description of the toast.' })),
  icon: Schema.optional(Schema.String.annotate({ description: 'The icon of the toast.' })),
  duration: Schema.optional(Schema.Number.annotate({ description: 'The duration of the toast.' })),
  closeLabel: Schema.optional(Translations.Label.annotate({ description: 'The label of the close button.' })),
  actionLabel: Schema.optional(Translations.Label.annotate({ description: 'The label of the action button.' })),
  actionAlt: Schema.optional(Translations.Label.annotate({ description: 'The alt text of the action button.' })),
  onAction: Schema.optional(
    Schema.Any.annotate({ description: 'The action to perform when the action button is clicked.' }),
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

/** Extracts a {@link NotifyOverride} from a failed process's `error` (`Process.Info.error`, a `SerializedError` whose `context` carries it), if present. */
export const getNotifyOverride = (failure: unknown): NotifyOverride | null => {
  if (!Predicate.isObject(failure) || !Predicate.isObject(failure.context)) {
    return null;
  }
  const override = failure.context.notifyOverride;
  // `context` is an untyped bag on a foreign error value; `Predicate.isObject` is the only structural
  // check available at this boundary, so the field shape beyond "is a record" can't be verified.
  return Predicate.isObject(override) ? (override as NotifyOverride) : null;
};

export const AddToast = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.addToast'),
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
// Workspace Operations
//

export const SwitchWorkspace = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.switchWorkspace'),
    name: 'Switch Workspace',
    description: 'Switch to a different workspace.',
    icon: 'ph--arrows-clockwise--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.String.annotate({ description: 'The id of the workspace to switch to.' }),
  }),
  output: Schema.Void,
});

export const RevertWorkspace = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.revertWorkspace'),
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

const NavigationMode = Schema.Literals(['immediate', 'validate']);

export const Open = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.open'),
    name: 'Open',
    description: 'Open items in the main content area. Takes navigation paths as subjects.',
    icon: 'ph--arrow-square-out--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    // TODO(dmaretskyi): use Ref.Ref(Obj.Unknown)
    subject: Schema.Array(
      Schema.String.annotate({
        description: 'Navigation paths of the items to open.',
      }),
    ),
    variant: Schema.optional(Schema.String.annotate({ description: 'The variant of the item to open.' })),
    name: Schema.optional(
      Schema.String.annotate({
        description:
          'Optional name for the plank, which behaves like a browser tab: opening under a name that ' +
          'is already taken reuses that plank in place rather than adding another. Callers that open ' +
          'a stream of one-at-a-time items (a message from a mailbox, say) pass a constant name so the ' +
          'deck does not grow an entry per item.',
      }),
    ),
    root: Schema.optional(
      Schema.String.annotate({
        description:
          'The deck root this open is relative to, whose type declares the chain of levels (see ' +
          '`level`). Only meaningful together with `level`.',
      }),
    ),
    level: Schema.optional(
      Schema.String.annotate({
        description:
          "Open at this level of the root's declared chain (e.g. `message` in `mailbox / message / " +
          "attachment`). The level supplies the plank name, so the level's plank is reused rather " +
          'than added to, and opening at a level closes every level below it — reading a second ' +
          "message drops the first one's attachment. Prefer this to hand-building `name`.",
      }),
    ),
    workspace: Schema.optional(Schema.String.annotate({ description: 'The workspace to open the items in.' })),
    scrollIntoView: Schema.optional(Schema.Boolean.annotate({ description: 'Scroll the items into view.' })),
    navigation: Schema.optional(
      NavigationMode.annotate({
        description:
          'How navigation should resolve the requested path. Use validate (the default) to check the path exists before navigating. Immediate is for internal use only.',
      }),
    ),
    pivotId: Schema.optional(Schema.String.annotate({ description: 'The id of the item to place new items next to.' })),
    disposition: Schema.optional(
      Schema.Literals(['solo', 'add', 'auto']).annotate({
        description:
          'How the deck should place the opened items. `solo` (the default) navigates: the deck becomes ' +
          'just the opened items, unless they are all already open (the existing plank scrolls into view). ' +
          '`add` inserts the items as new planks — immediately after `pivotId` when provided (in-plank ' +
          'navigation anchors at its origin), else at the end of the deck. `auto` follows the deck: ' +
          'when already sliding (2+ planks) it adds beside its origin (`pivotId`, falling back to the ' +
          'attended plank); when solo it navigates. Holding shift (via `modifiers`) forces any ' +
          'disposition into `add`.',
      }),
    ),
    modifiers: Schema.optional(
      Schema.Struct({
        shift: Schema.optional(Schema.Boolean),
      }).annotate({
        description:
          'Input modifiers held during the navigation gesture; shift forces the opened items into new planks.',
      }),
    ),
  }),
  output: Schema.Array(Schema.String).annotate({ description: 'The resolved navigation paths that were opened.' }),
});

export const Close = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.close'),
    name: 'Close',
    description: 'Close items in the main content area.',
    icon: 'ph--x--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.Array(Schema.String.annotate({ description: 'Ids of the items to close.' })),
  }),
  output: Schema.Void,
});

export const Set = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.set'),
    name: 'Set',
    description: 'Override items in the main content area.',
    icon: 'ph--layout--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.Array(Schema.String.annotate({ description: 'Ids of the items to set.' })),
  }),
  output: Schema.Void,
});

//
// Navigation Operations
//

export const ScrollIntoView = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.scrollIntoView'),
    name: 'Scroll Into View',
    description: 'Scroll an item into view.',
    icon: 'ph--eye--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.optional(Schema.String.annotate({ description: 'The id of the item to scroll into view.' })),
    cursor: Schema.optional(Schema.String.annotate({ description: 'A cursor to scroll to within the item.' })),
    ref: Schema.optional(Schema.String.annotate({ description: 'A reference id for the scroll target.' })),
  }),
  output: Schema.Void,
});

export const Expose = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.expose'),
    name: 'Expose',
    description: 'Expose an item in the navigation area.',
    icon: 'ph--eye--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.String.annotate({ description: 'The id of the item to expose.' }),
  }),
  output: Schema.Void,
});

//
// Companion Operations
//

export const UpdateCompanion = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.updateCompanion'),
    name: 'Update Companion',
    description: 'Update the companion plank for a primary plank.',
    icon: 'ph--sidebar--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.Union([Schema.String, Schema.Null]).annotate({
      description:
        'The companion node id to show — either qualified (`<plank>/~<variant>`) or a bare `~<variant>`, which targets the given anchor, else the attended plank. Null closes a companion.',
    }),
    anchor: Schema.optional(Schema.String).annotate({
      description:
        'The plank whose companion to open or close, used when the subject names no plank (a close, or a bare `~<variant>`). Companion state is per plank, so a call from a specific plank must name it; without it the handler falls back to the attended plank.',
    }),
  }),
  output: Schema.Void,
});

//
// Selection Operations
//

export const Select = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.select'),
    name: 'Select',
    description: 'Select items in an attention context.',
    icon: 'ph--check--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    contextId: Schema.String.annotate({ description: 'The id of the attention context.' }),
    subject: Selection.Selection.annotate({ description: 'The selection to apply.' }),
  }),
  output: Schema.Void,
});
