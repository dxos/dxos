//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilder, type ActionGroupBuilderFn } from '@dxos/react-ui-menu';

// Shared icons so the open/delete actions look identical across the Event and Message toolbars.
const OPEN_ICON = 'ph--arrow-square-out--regular';
const DELETE_ICON = 'ph--trash--regular';

export type OpenGroupOptions = {
  /** Translation namespace for the label. */
  ns: string;
  /** Translation key for the action label (per-family; e.g. `event-toolbar-open.menu`). */
  labelKey: string;
  onOpen: () => void;
  /** Disable the action (e.g. while editing a draft). */
  disabled?: boolean;
};

/**
 * The "open" toolbar action (promote a companion to the main view). Shared by the Event and Message
 * toolbars; compose via `MenuBuilder.subgraph(openGroup(...))`.
 */
export const openGroup =
  ({ ns, labelKey, onOpen, disabled }: OpenGroupOptions): ActionGroupBuilderFn =>
  (builder) => {
    builder.action('open', { label: [labelKey, { ns }], icon: OPEN_ICON, disabled }, onOpen);
  };

export type DeleteActionOptions = {
  ns: string;
  labelKey: string;
  onDelete: () => void;
};

/**
 * Adds the "delete" action to any builder or group. Use directly inside a `group(...)` callback (e.g. the
 * Event toolbar's overflow `more` dropdown) or via {@link deleteGroup} at the toolbar root.
 */
export const deleteAction = (builder: ActionGroupBuilder, { ns, labelKey, onDelete }: DeleteActionOptions): void => {
  builder.action('delete', { label: [labelKey, { ns }], icon: DELETE_ICON }, onDelete);
};

/**
 * The "delete" toolbar action at the toolbar root. Shared by the Event and Message toolbars; compose via
 * `MenuBuilder.subgraph(deleteGroup(...))`.
 */
export const deleteGroup =
  (options: DeleteActionOptions): ActionGroupBuilderFn =>
  (builder) => {
    deleteAction(builder, options);
  };
