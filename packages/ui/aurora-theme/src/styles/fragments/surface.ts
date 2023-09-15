//
// Copyright 2023 DXOS.org
//

// NOTE: Please don’t make changes to these fragments without testing *all* the places where they’re used.

// If your scope of concern is narrower than exactly *the entire design system*, please define and apply your own
// fragment, either to the specific component or in an override to `ThemeProvider`’s `tx` value.

// Main background.
// NOTE: This should align with theme's root --surface-bg.
export const baseSurface = 'bg-neutral-12 dark:bg-neutral-900';

// Sidebars, main heading (“topbar”), and nothing else.
export const fixedSurface = 'bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur';

// Cards, dialogs, other such groups.
export const groupSurface = 'bg-neutral-50 dark:bg-neutral-850 border';

// Tooltips, popovers, menus, etc. – not dialogs.
export const chromeSurface = 'bg-neutral-12 dark:bg-neutral-800';

// Elements that benefit from higher contrast, e.g. inputs, textareas, etc
export const inputSurface = 'bg-white dark:bg-neutral-925';
