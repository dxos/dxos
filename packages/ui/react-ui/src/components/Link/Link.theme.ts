//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type LinkStyleProps = {
  variant?: 'accent' | 'neutral';
};

const root: ComponentFunction<LinkStyleProps> = ({ variant }, ...etc) =>
  mx(
    'underline decoration-1 underline-offset-2 transition-color rounded-xs',
    variant === 'neutral'
      ? 'text-inherit hover:opacity-90 visited:text-inherit visited:hover:opacity-90'
      : 'text-accent-text hover:text-accent-text-hover visited:text-accent-text visited:hover:text-accent-text-hover',
    'dx-focus-ring',
    ...etc,
  );

export const linkTheme: Theme<LinkStyleProps> = {
  root,
};
