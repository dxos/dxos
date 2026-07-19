//
// Copyright 2025 DXOS.org
//

export const layoutAppliesTopbar = (breakpoint: string, fullscreen?: boolean) => {
  return document.body.getAttribute('data-platform') === 'windows' && breakpoint === 'desktop' && !fullscreen;
};
