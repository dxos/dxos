//
// Copyright 2025 DXOS.org
//

import { type Theme, type ComponentFunction } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { descriptionMessage } from '../fragments';

export type AlertStyleProps = {};

export const alertRoot: ComponentFunction<AlertStyleProps> = (_, etc) => {
  return mx('max-w-[calc(100%-2rem)] is-full m-4 place-self-center text-center rounded-md', descriptionMessage, etc);
};

export const alertTitle: ComponentFunction<AlertStyleProps> = () => {
  return mx('mbe-2 font-medium text-baseText');
};

export const alertTheme: Theme<AlertStyleProps> = {
  root: alertRoot,
  title: alertTitle,
};
