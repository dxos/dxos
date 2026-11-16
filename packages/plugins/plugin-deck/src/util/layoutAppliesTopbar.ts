//
// Copyright 2025 DXOS.org
//

/**
 * Whether the layout reserves a topbar. A plugin `banner` option forces it outside fullscreen;
 * otherwise only Windows does, and only at desktop width.
 */
export const layoutAppliesTopbar = (breakpoint: string, fullscreen?: boolean, banner?: boolean) => {
  if (fullscreen) {
    return false;
  }
  return !!banner || (document.body.getAttribute('data-platform') === 'windows' && breakpoint === 'desktop');
};
