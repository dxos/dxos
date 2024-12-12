//
// Copyright 2023 DXOS.org
//

import { z } from 'zod';

import { type Plugin } from '../plugin-host';
import { type IntentData } from '../plugin-intent';

//
// Provides
//

export const Toast = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  // TODO(wittjosiah): `icon` should be string to be parsed by an `Icon` component.
  icon: z.any().optional(),
  duration: z.number().optional(),
  closeLabel: z.string().optional(),
  actionLabel: z.string().optional(),
  actionAlt: z.string().optional(),
  onAction: z.function().optional(),
});

export type Toast = z.infer<typeof Toast>;

/**
 * Basic state provided by a layout plugin.
 *
 * Layout provides the state of global UI landmarks, such as the sidebar, dialog, and popover.
 * Generally only one dialog or popover should be open at a time, a layout plugin should manage this.
 * For other landmarks, such as toasts, rendering them in the layout prevents them from unmounting when navigating.
 */

const LayoutMode = z.union([z.literal('deck'), z.literal('solo'), z.literal('fullscreen')]);
export const isLayoutMode = (value: any): value is LayoutMode => LayoutMode.safeParse(value).success;
export type LayoutMode = z.infer<typeof LayoutMode>;

// TODO(wittjosiah): Replace Zod w/ Effect Schema to align with ECHO.
export const Layout = z.object({
  layoutMode: z.union([z.literal('deck'), z.literal('solo'), z.literal('fullscreen')]),

  sidebarOpen: z.boolean(),
  complementarySidebarOpen: z.boolean(),
  /**
   * @deprecated
   */
  complementarySidebarContent: z
    .any()
    .optional()
    .describe('DEPRECATED. Data to be passed to the complementary sidebar Surface.'),

  dialogOpen: z.boolean(),
  dialogContent: z.any().optional().describe('Data to be passed to the dialog Surface.'),
  // TODO(wittjosiah): Custom properties?
  dialogBlockAlign: z.union([z.literal('start'), z.literal('center')]).optional(),
  dialogType: z.union([z.literal('default'), z.literal('alert')]).optional(),

  popoverOpen: z.boolean(),
  popoverContent: z.any().optional().describe('Data to be passed to the popover Surface.'),
  popoverAnchorId: z.string().optional(),

  toasts: z.array(Toast),

  scrollIntoView: z
    .string()
    .optional()
    .describe('The identifier of a component to scroll into view when it is mounted.'),
});

export type Layout = z.infer<typeof Layout>;

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
  const { success } = Layout.safeParse((plugin.provides as any).layout);
  return success ? (plugin as Plugin<LayoutProvides>) : undefined;
};

//
// Intents
//

const LAYOUT_PLUGIN = 'dxos.org/plugin/layout';

const LAYOUT_ACTION = `${LAYOUT_PLUGIN}/action`;

export enum LayoutAction {
  SET_LAYOUT = `${LAYOUT_ACTION}/set-layout`,
  SET_LAYOUT_MODE = `${LAYOUT_ACTION}/set-layout-mode`,
  SCROLL_INTO_VIEW = `${LAYOUT_ACTION}/scroll-into-view`,
  UPDATE_PLANK_SIZE = `${LAYOUT_ACTION}/update-plank-size`,
}

/**
 * Expected payload for layout actions.
 */
export namespace LayoutAction {
  export type SetLayoutMode = IntentData<{
    layoutMode?: LayoutMode;
    revert?: boolean;
  }>;

  export type SetLayout = IntentData<{
    /**
     * Element to set the state of.
     */
    element: 'fullscreen' | 'sidebar' | 'complementary' | 'dialog' | 'popover' | 'toast';

    /**
     * Whether the element is on or off.
     *
     * If omitted, the element's state will be toggled or set based on other provided data.
     * For example, if `component` is provided, the state will be set to `true`.
     */
    state?: boolean;

    /**
     * Component to render in the dialog or popover.
     */
    component?: string;

    /**
     * Data to be passed to the dialog or popover Surface.
     */
    subject?: any;

    /**
     * Anchor ID for the popover.
     */
    anchorId?: string;

    // TODO(wittjosiah): Custom properties?

    /**
     * Block alignment for the dialog.
     */
    dialogBlockAlign?: 'start' | 'center';

    /**
     * Type of dialog.
     */
    dialogType?: 'default' | 'alert';
  }>;
}
