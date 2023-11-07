//
// Copyright 2023 DXOS.org
//

// NOTE: Please don’t make changes to these fragments without testing *all* the places where they’re used.

// If your scope of concern is narrower than exactly *the entire design system*, please define and apply your own
// fragment, either to the specific component or in an override to `ThemeProvider`’s `tx` value.

// Main background.
// NOTE: This should align with theme's root --surface-bg.
export const baseSurface = 'base-surface';

// Sidebars, main heading (“topbar”), and nothing else.
export const fixedSurface = 'fixed-surface backdrop-blur-md dark:backdrop-blur-lg';
export const fixedBorder = 'border-neutral-50 dark:border-neutral-800';

// Cards, dialogs, other such groups.
export const groupSurface = 'group-surface';

// Tooltips, popovers, menus, etc. – not dialogs.
export const chromeSurface = 'chrome-surface';

// Elements that benefit from higher contrast, e.g. inputs, textareas, etc
export const inputSurface = 'input-surface';
