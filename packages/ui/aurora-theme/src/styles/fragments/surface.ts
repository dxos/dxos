//
// Copyright 2023 DXOS.org
//

// Main background.
export const baseSurface = 'bg-neutral-75 dark:bg-neutral-900';

// Control panel.
export const groupSurface = 'bg-neutral-50 dark:bg-neutral-850';

// Popovers.
export const chromeSurface = 'bg-white dark:bg-neutral-800';

// Content (document, canvas, etc.)
export const paperSurface = 'bg-white dark:bg-neutral-925';

// TODO(burdon): Temp for main surfaces to prevent bounce/scroll. Test with Kanban and Drawing.
// todo(thure): These are layout rules rather than background colors; this fragment
export const fullSurface = 'flex flex-col h-full fixed inset-0 overflow-hidden overscroll-none';
