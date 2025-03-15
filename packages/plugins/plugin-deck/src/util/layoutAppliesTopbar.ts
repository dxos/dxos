//
// Copyright 2025 DXOS.org
//

export const layoutAppliesTopbar = (breakpoint: string) => {
  return document.body.getAttribute('data-platform') === 'win' && breakpoint === 'desktop';
};
