//
// Copyright 2022 DXOS.org
//

/**
 * @deprecated
 */
export const hoverColors =
  'transition-colors duration-100 linear hover:text-black dark:hover:text-white hover:bg-neutral-25 dark:hover:bg-neutral-750';

export const hoverableControls =
  '[--controls-opacity:1] hover-hover:[--controls-opacity:0] hover-hover:hover:[--controls-opacity:1]';

export const hoverableFocusedKeyboardControls = 'focus-visible:[--controls-opacity:1]';
export const hoverableFocusedWithinControls = 'focus-within:[--controls-opacity:1]';
export const hoverableFocusedControls = 'focus:[--controls-opacity:1]';
export const staticHoverableControls = 'hover-hover:[--controls-opacity:1]';

export const hoverableControlItem = 'opacity-[--controls-opacity]';
export const hoverableOpenControlItem = 'hover-hover:data-[state=open]:[--controls-opacity:1]';
