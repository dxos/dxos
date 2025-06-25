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
  return mx('p-trimMd rounded-md is-full', messageValence(valence), etc);
};

export const messageTitle: ComponentFunction<MessageStyleProps> = ({ valence }, etc) => {
  return mx('mbe-trimSm font-medium flex gap-trimXs items-center', etc);
};

export const messageIcon: ComponentFunction<MessageStyleProps> = ({ valence }, etc) => {
  return mx(etc);
};

export const messageContent: ComponentFunction<MessageStyleProps> = ({ valence }, etc) => {
  return mx('font-medium', etc);
};

export const messageTheme: Theme<MessageStyleProps> = {
  root: messageRoot,
  content: messageContent,
  icon: messageIcon,
  title: messageTitle,
};
