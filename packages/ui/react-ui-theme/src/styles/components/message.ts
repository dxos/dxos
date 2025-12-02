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
  return mx('p-trimSm rounded-md', messageValence(valence), etc);
};

export const messageTitle: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('font-medium flex gap-trimSm', etc);
};

export const messageIcon: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('flex bs-[1lh] items-center', etc);
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
