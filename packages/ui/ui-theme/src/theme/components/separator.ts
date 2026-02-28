//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { blockSeparator, inlineSeparator } from '../fragments';

export type SeparatorStyleProps = {
  orientation?: 'horizontal' | 'vertical';
  subdued?: boolean;
};

export const separatorRoot: ComponentFunction<SeparatorStyleProps> = ({ orientation, subdued }, ...etc) =>
  mx(
    orientation === 'vertical' ? inlineSeparator : blockSeparator,
    subdued ? 'border-subdued-separator' : 'border-separator',
    ...etc,
  );

export const separatorTheme: Theme<SeparatorStyleProps> = {
  root: separatorRoot,
};
