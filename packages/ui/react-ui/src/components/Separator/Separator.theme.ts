//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type SeparatorStyleProps = {
  orientation?: 'horizontal' | 'vertical';
  subdued?: boolean;
};

const root: ComponentFunction<SeparatorStyleProps> = ({ orientation, subdued }, ...etc) =>
  mx(
    'self-stretch',
    orientation === 'vertical' ? 'border-e mx-1' : 'border-b my-1',
    subdued ? 'border-subdued-separator' : 'border-separator',
    ...etc,
  );

export const separatorTheme: Theme<SeparatorStyleProps> = {
  root,
};
