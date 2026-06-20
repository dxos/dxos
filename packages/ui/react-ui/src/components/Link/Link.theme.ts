//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type LinkStyleProps = {
  variant?: 'accent' | 'neutral';
};

const root: ComponentFunction<LinkStyleProps> = ({ variant }, ...etc) => mx('dx-link', ...etc);

export const linkTheme: Theme<LinkStyleProps> = {
  root,
};
