//
// Copyright 2024 DXOS.org
//


export type StatusBarActionsProps = {};

// Reserved slot for the main bottom bar; currently empty. Plugins can contribute
// to roles `status-bar` / `status-bar--r1-footer` via the surface system to fill it.
export const StatusBarActions = (_props: StatusBarActionsProps) => {
  return null;
};
