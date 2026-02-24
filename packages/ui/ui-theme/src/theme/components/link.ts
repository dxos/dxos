//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { focusRing } from '../fragments';

export type LinkStyleProps = {
  variant?: 'accent' | 'neutral';
};

export const linkRoot: ComponentFunction<LinkStyleProps> = ({ variant }, ...etc) =>
  mx(
    'underline decoration-1 underline-offset-2 transition-color rounded-xs',
    variant === 'neutral'
      ? 'text-inherit hover:opacity-90 visited:text-inherit visited:hover:opacity-90'
      : 'text-accent-text hover:text-accent-text-hover visited:text-accent-text visited:hover:text-accent-text-hover',
    focusRing,
    ...etc,
  );

export const linkTheme: Theme<LinkStyleProps> = {
  root: linkRoot,
};
