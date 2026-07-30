//
// Copyright 2022 DXOS.org
//

export const ghostHover = 'hover:bg-hover-surface';
export const ghostFocusWithin = 'focus-within:bg-hover-surface';

export const hoverableControls =
  '[--controls-opacity:1] [--controls-visibility:visible] hover-hover:[--controls-opacity:0] hover-hover:[--controls-visibility:hidden] hover-hover:hover:[--controls-opacity:1] hover-hover:hover:[--controls-visibility:visible]';

export const groupHoverControlItemWithTransition = 'transition-opacity duration-200 opacity-0 group-hover:opacity-100';

export const hoverableFocusedKeyboardControls =
  'focus-visible:[--controls-opacity:1] focus-visible:[--controls-visibility:visible]';
export const hoverableFocusedWithinControls =
  'focus-within:[--controls-opacity:1] focus-within:[--controls-visibility:visible]';
export const hoverableOpenControlItem =
  'hover-hover:aria-[expanded=true]:[--controls-opacity:1] hover-hover:aria-[expanded=true]:[--controls-visibility:visible]';
export const hoverableControlItem = 'opacity-(--controls-opacity)';

/**
 * Controls that float *over* content rather than sitting beside it. Transparency alone would leave
 * an invisible toolbar swallowing the clicks and text selection of whatever it covers, so visibility
 * — which does suppress pointer events, and keeps the box's layout so a popover can stay anchored to
 * it — tracks the same hover state. Defaults to visible for a host that sets no controls state.
 */
export const hoverableOverlayControlItem =
  'opacity-(--controls-opacity) [visibility:var(--controls-visibility,visible)]';
