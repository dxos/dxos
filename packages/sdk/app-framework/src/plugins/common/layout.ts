//
// Copyright 2023 DXOS.org
//

import { z } from 'zod';

import type { Plugin } from '../PluginHost';

//
// Provides
//

/**
 * Basic state provided by a layout plugin.
 */
export const Layout = z.object({
  fullscreen: z.boolean(),
  sidebarOpen: z.boolean(),
  complementarySidebarOpen: z.boolean(),

  dialogContent: z.any().optional().describe('Data to be passed to the dialog Surface.'),
  dialogOpen: z.boolean(),

  popoverAnchorId: z.string().optional(),
  popoverContent: z.any().optional().describe('Data to be passed to the popover Surface.'),
  popoverOpen: z.boolean(),

  // TODO(wittjosiah): Array?
  active: z.string().optional().describe('Id of the currently active item.'),
  // TODO(wittjosiah): History?
  previous: z.string().optional(),
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

const LAYOUT_ACTION = 'dxos.org/plugin/intent';
// TODO(wittjosiah): Consider consolidating some action types (e.g. toggle).
export enum LayoutAction {
  TOGGLE_FULLSCREEN = `${LAYOUT_ACTION}/toggle-fullscreen`,
  TOGGLE_SIDEBAR = `${LAYOUT_ACTION}/toggle-sidebar`,
  TOGGLE_COMPLEMENTARY_SIDEBAR = `${LAYOUT_ACTION}/toggle-complementary-sidebar`,
  OPEN_DIALOG = `${LAYOUT_ACTION}/open-dialog`,
  CLOSE_DIALOG = `${LAYOUT_ACTION}/close-dialog`,
  OPEN_POPOVER = `${LAYOUT_ACTION}/open-popover`,
  CLOSE_POPOVER = `${LAYOUT_ACTION}/close-popover`,
  ACTIVATE = `${LAYOUT_ACTION}/activate`,
}

/**
 * Expected payload for layout actions.
 */
export namespace LayoutAction {
  export type ToggleFullscreen = {
    state?: boolean;
  };

  export type ToggleSidebar = {
    state?: boolean;
  };

  export type ToggleComplementarySidebar = {
    state?: boolean;
  };

  export type OpenDialog = {
    component: string;
    subject: any;
  };

  export type CloseDialog = {};

  export type OpenPopover = {
    anchorId: string;
    component: string;
    subject: any;
  };

  export type ClosePopover = {};

  export type Activate = {
    id: string;
  };
}
