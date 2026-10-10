//
// Copyright 2025 DXOS.org
//

import * as Hooks from '@dxos/react-ui/Hooks';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export const useBreakpoints = (): Breakpoint => {
  const [isNotMobile] = Hooks.useMediaQuery('md');
  const [isDesktop] = Hooks.useMediaQuery('lg');
  return isDesktop ? 'desktop' : isNotMobile ? 'tablet' : 'mobile';
};
