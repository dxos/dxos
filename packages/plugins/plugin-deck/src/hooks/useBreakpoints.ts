//
// Copyright 2025 DXOS.org
//

import { useMediaQuery } from '@dxos/react-ui';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export const useBreakpoints = (): Breakpoint => {
  const [isNotMobile] = useMediaQuery('md');
  const [isDesktop] = useMediaQuery('lg');
  return isDesktop ? 'desktop' : isNotMobile ? 'tablet' : 'mobile';
};
