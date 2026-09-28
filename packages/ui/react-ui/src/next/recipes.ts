//
// Copyright 2026 DXOS.org
//

/**
 * Class recipes shared by every binding (decision 8): plain functions fixed at build time, so a React and a Solid part
 * emit identical classes. Geometry and colour live in `theme/*.css`; recipes only name the rules.
 */

const FOCUS_RING = 'nx-focus-ring';

export const recipes = {
  container: () => 'nx-grid',
  scrollRoot: () => 'nx-scroll-root',
  scrollViewport: () => 'nx-scroll-viewport',
  block: () => 'nx-block',
  icon: () => 'nx-icon',
  typography: () => 'nx-typography',
  toolbar: () => 'nx-toolbar',
  group: () => 'nx-group',
  label: () => 'nx-label',
  input: () => `nx-control nx-input ${FOCUS_RING}`,
  button: () => `nx-control nx-button ${FOCUS_RING}`,
  field: () => 'nx-field',
  fieldHeader: () => 'nx-field-header',
  fieldHelper: () => 'nx-field-helper',
  fieldError: () => 'nx-field-error',
  checkbox: () => 'nx-checkbox',
  checkboxControl: () => 'nx-checkbox-control',
  selectTrigger: () => `nx-control nx-select-trigger ${FOCUS_RING}`,
  popup: () => 'nx-popup',
  selectItem: () => 'nx-select-item',
  dialogBackdrop: () => 'nx-dialog-backdrop',
  dialogPositioner: () => 'nx-dialog-positioner',
  dialogContent: () => 'nx-dialog',
  dialogHeader: () => 'nx-dialog-header',
  dialogTitle: () => 'nx-dialog-title',
  dialogDescription: () => 'nx-dialog-description',
  dialogBody: () => 'nx-dialog-body',
  dialogFooter: () => 'nx-dialog-footer',
  switch: () => 'nx-switch',
  switchControl: () => 'nx-switch-control',
  switchThumb: () => 'nx-switch-thumb',
  fieldsetRoot: () => 'nx-fieldset',
  fieldsetLegend: () => 'nx-fieldset-legend',
  image: () => 'nx-image',
  cardRoot: () => 'nx-card',
  cardPoster: () => 'nx-card-poster',
  cardHeader: () => 'nx-card-header',
  cardTitle: () => 'nx-card-title',
  cardDescription: () => 'nx-card-description',
  collapsible: () => 'nx-collapsible',
  collapsibleTrigger: () => `nx-collapsible-trigger ${FOCUS_RING}`,
  collapsibleIndicator: () => 'nx-collapsible-indicator',
  collapsibleContent: () => 'nx-collapsible-content',
  menuContent: () => 'nx-menu',
  menuItem: () => 'nx-menu-item',
  menuItemText: () => 'nx-menu-item-text',
  menuShortcut: () => 'nx-menu-shortcut',
  menuSeparator: () => 'nx-menu-separator',
  menuGroupLabel: () => 'nx-menu-group-label',
  tooltipContent: () => 'nx-tooltip',
} as const;
