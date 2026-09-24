//
// Copyright 2025 DXOS.org
//

/** Whether the layout reserves a topbar, which only Windows does, and only at desktop width. */
export const layoutAppliesTopbar = (breakpoint: string, fullscreen?: boolean) => {
  return document.body.getAttribute('data-platform') === 'windows' && breakpoint === 'desktop' && !fullscreen;
};
