//
// Copyright 2025 DXOS.org
//

export const layoutAppliesTopbar = (breakpoint: string, fullscreen?: boolean, banner?: boolean) => {
  if (fullscreen) {
    return false;
  }
  return !!banner || (document.body.getAttribute('data-platform') === 'windows' && breakpoint === 'desktop');
};
