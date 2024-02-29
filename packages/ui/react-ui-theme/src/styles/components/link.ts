//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { focusRing } from '../fragments';

export type LinkStyleProps = {
  variant?: 'accent' | 'neutral';
};

export const linkRoot: ComponentFunction<LinkStyleProps> = ({ variant }, ...etc) =>
  mx(
    'underline decoration-1 underline-offset-2 transition-color rounded-sm',
    variant === 'neutral'
      ? 'text-inherit hover:opacity-90 visited:text-inherit visited:hover:opacity-90'
      : 'fg-accent hover:fg-accentHover visited:fg-accent visited:hover:fg-accentHover',
    focusRing,
    ...etc,
  );

export const linkTheme: Theme<LinkStyleProps> = {
  root: linkRoot,
};
