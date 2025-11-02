//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type MessageValence, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { messageValence } from '../fragments';

export type MessageStyleProps = {
  valence?: MessageValence;
  elevation?: Elevation;
};

export const messageRoot: ComponentFunction<MessageStyleProps> = ({ valence }, etc) => {
  return mx('p-trimMd rounded-md', messageValence(valence), etc);
};

export const messageTitle: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('mbe-trimSm last:mbe-0 font-medium flex items-center gap-2 gap-trimXs', etc);
};

export const messageIcon: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx(etc);
};

export const messageContent: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('first:font-medium', etc);
};

export const messageTheme: Theme<MessageStyleProps> = {
  root: messageRoot,
  content: messageContent,
  icon: messageIcon,
  title: messageTitle,
};
