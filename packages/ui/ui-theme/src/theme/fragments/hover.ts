//
// Copyright 2022 DXOS.org
//

/** TODO(burdon): AUDIT AND REPLACE WITH TW CLASSES */

export const hoverColors = 'transition-colors duration-100 linear hover:bg-hover-surface';

export const ghostHover = 'hover:bg-hover-surface';
export const ghostFocusWithin = 'focus-within:bg-hover-surface';
export const subtleHover = 'hover:bg-hover-overlay';

export const hoverableControls =
  '[--controls-opacity:1] hover-hover:[--controls-opacity:0] hover-hover:hover:[--controls-opacity:1]';

export const groupHoverControlItemWithTransition = 'transition-opacity duration-200 opacity-0 group-hover:opacity-100';

export const hoverableFocusedKeyboardControls = 'focus-visible:[--controls-opacity:1]';
export const hoverableFocusedWithinControls = 'focus-within:[--controls-opacity:1]';
export const hoverableFocusedControls = 'focus:[--controls-opacity:1]';
export const hoverableOpenControlItem = 'hover-hover:aria-[expanded=true]:[--controls-opacity:1]';
export const hoverableControlItem = 'opacity-(--controls-opacity)';
export const hoverableControlItemTransition = 'transition-opacity duration-200';
export const staticHoverableControls = 'hover-hover:[--controls-opacity:1]';
