//
// Copyright 2025 DXOS.org
//

import { type MessageValence, type Theme, type ComponentFunction } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { descriptionMessage, messageValence } from '../fragments';

export type CalloutStyleProps = {
  valence?: MessageValence;
};

export const calloutRoot: ComponentFunction<CalloutStyleProps> = ({ valence }, etc) => {
  return mx('flex gap-3 items-center rounded-md', messageValence(valence), descriptionMessage, etc);
};

export const calloutIcon: ComponentFunction<CalloutStyleProps> = ({ valence }, etc) => {
  return mx(etc);
};

export const calloutText: ComponentFunction<CalloutStyleProps> = ({ valence }, etc) => {
  return mx('font-medium text-subdued', etc);
};

export const calloutTheme: Theme<CalloutStyleProps> = {
  root: calloutRoot,
  icon: calloutIcon,
  text: calloutText,
};
