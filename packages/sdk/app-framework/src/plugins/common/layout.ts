//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { type Plugin } from '../plugin-host';
import { Label } from '../plugin-intent';

//
// Provides
//

export const Toast = S.Struct({
  id: S.String,
  title: S.optional(Label),
  description: S.optional(Label),
  icon: S.optional(S.String),
  duration: S.optional(S.Number),
  closeLabel: S.optional(Label),
  actionLabel: S.optional(Label),
  actionAlt: S.optional(Label),
  // TODO(wittjosiah): Make class with customizable method?
  onAction: S.optional(S.Any),
});

export type Toast = S.Schema.Type<typeof Toast>;

/**
 * Basic state provided by a layout plugin.
 *
 * Layout provides the state of global UI landmarks, such as the sidebar, dialog, and popover.
 * Generally only one dialog or popover should be open at a time, a layout plugin should manage this.
 * For other landmarks, such as toasts, rendering them in the layout prevents them from unmounting when navigating.
 */

const LayoutMode = S.Union(S.Literal('deck'), S.Literal('solo'), S.Literal('fullscreen'));
export const isLayoutMode = (value: any): value is LayoutMode => S.is(LayoutMode)(value);
export type LayoutMode = S.Schema.Type<typeof LayoutMode>;

export const Layout = S.mutable(
  S.Struct({
    layoutMode: LayoutMode,

    sidebarOpen: S.Boolean,
    complementarySidebarOpen: S.Boolean,
    /**
     * @deprecated Data to be passed to the complementary sidebar Surface.
     */
    complementarySidebarContent: S.optional(S.Any),

    dialogOpen: S.Boolean,
    /**
     * Data to be passed to the dialog Surface.
     */
    dialogContent: S.optional(S.Any),
    // TODO(wittjosiah): Custom properties?
    dialogBlockAlign: S.optional(S.Literal('start', 'center')),
    dialogType: S.optional(S.Literal('default', 'alert')),

    popoverOpen: S.Boolean,
    /**
     * Data to be passed to the popover Surface.
     */
    popoverContent: S.optional(S.Any),
    popoverAnchorId: S.optional(S.String),

    toasts: S.mutable(S.Array(Toast)),

    /**
     * The identifier of a component to scroll into view when it is mounted.
     */
    scrollIntoView: S.optional(S.String),
  }),
);

export type Layout = S.Schema.Type<typeof Layout>;

/**
 * Provides for a plugin that can manage the app layout.
 */
export type LayoutProvides = {
  layout: Readonly<Layout>;
};

/**
 * Type guard for layout plugins.
 */
export const parseLayoutPlugin = (plugin: Plugin) => {
  const success = S.is(Layout)((plugin.provides as any).layout);
  return success ? (plugin as Plugin<LayoutProvides>) : undefined;
};

//
// Intents
//

export const LAYOUT_PLUGIN = 'dxos.org/plugin/layout';
export const LAYOUT_ACTION = `${LAYOUT_PLUGIN}/action`;

/**
 * Expected payload for layout actions.
 */
export namespace LayoutAction {
  export class SetLayout extends S.TaggedClass<SetLayout>()(`${LAYOUT_ACTION}/set-layout`, {
    input: S.Struct({
      /**
       * Element to set the state of.
       */
      element: S.Literal('fullscreen', 'sidebar', 'complementary', 'dialog', 'popover', 'toast'),

      /**
       * Whether the element is on or off.
       *
       * If omitted, the element's state will be toggled or set based on other provided data.
       * For example, if `component` is provided, the state will be set to `true`.
       */
      state: S.optional(S.Boolean),

      /**
       * Component to render in the dialog or popover.
       */
      component: S.optional(S.String),

      /**
       * Data to be passed to the dialog or popover Surface.
       */
      subject: S.optional(S.Any),

      /**
       * Anchor ID for the popover.
       */
      anchorId: S.optional(S.String),

      // TODO(wittjosiah): Custom properties?

      /**
       * Block alignment for the dialog.
       */
      dialogBlockAlign: S.optional(S.Literal('start', 'center')),

      /**
       * Type of dialog.
       */
      dialogType: S.optional(S.Literal('default', 'alert')),
    }),
    output: S.Void,
  }) {}

  // TODO(wittjosiah): Do all these need to be separate actions?

  export class SetLayoutMode extends S.TaggedClass<SetLayoutMode>()(`${LAYOUT_ACTION}/set-layout-mode`, {
    input: S.Union(
      S.Struct({
        layoutMode: LayoutMode,
      }),
      S.Struct({
        revert: S.Literal(true),
      }),
    ),
    output: S.Void,
  }) {}

  export class ScrollIntoView extends S.TaggedClass<ScrollIntoView>()(`${LAYOUT_ACTION}/scroll-into-view`, {
    input: S.Struct({
      id: S.optional(S.String),
      // TODO(wittjosiah): Factor out to thread scroll into view action?
      cursor: S.optional(S.String),
      ref: S.optional(S.String),
    }),
    output: S.Void,
  }) {}
}
