//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { blockSeparator, inlineSeparator, separatorBorderColor } from '../fragments';

export type SeparatorStyleProps = {
  orientation?: 'horizontal' | 'vertical';
};

export const separatorRoot: ComponentFunction<SeparatorStyleProps> = ({ orientation }, ...etc) =>
  mx(orientation === 'vertical' ? inlineSeparator : blockSeparator, separatorBorderColor, ...etc);

export const separatorTheme: Theme<SeparatorStyleProps> = {
  root: separatorRoot,
};
