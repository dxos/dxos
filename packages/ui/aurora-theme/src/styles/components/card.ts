//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';

export type CardStyleProps = Partial<{}>;

export const cardRoot: ComponentFunction<CardStyleProps> = () => mx();

export const cardTheme: Theme<CardStyleProps> = {
  root: cardRoot,
};
