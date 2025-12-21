//
// Copyright 2023 DXOS.org
//

// NOTE: Please don’t make changes to these fragments without testing *all* the places where they’re used.

// If your scope of concern is narrower than exactly *the entire design system*, please define and apply your own
// fragment, either to the specific component or in an override to `ThemeProvider`’s `tx` value.

// Main background.
// NOTE: This should align with theme's root --surface-bg.
export const baseSurface = 'base-surface';

// Sidebars.
export const sidebarSurface = 'sidebar-surface backdrop-blur-md dark:backdrop-blur-lg';
export const sidebarBorder = 'border-separator';

// Generic grouping style.
export const activeSurface = 'base-surface';
export const groupBorder = 'border-separator';

// Tooltips, popovers, menus, dialogs, etc.
export const modalSurface = 'modal-surface backdrop-blur-md';

// Elements that actively have the user’s “attention”; prefer to select with CSS-native selectors like focus-within,
// but may be applied by app state. ⚠️ Do not apply statically.
export const attentionSurface = 'attention-surface';

export const accentSurface = 'bg-accentSurface text-accentSurfaceText';
