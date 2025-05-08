//
// Copyright 2025 DXOS.org
//

import { useMediaQuery } from '@dxos/react-ui';

export const useBreakpoints = () => {
  const [isNotMobile] = useMediaQuery('md');
  const [isDesktop] = useMediaQuery('lg');
  return isDesktop ? 'desktop' : isNotMobile ? 'tablet' : 'mobile';
};
