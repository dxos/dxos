//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type MessageValence, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { messageValence } from '../fragments';

export type MessageStyleProps = {
  valence?: MessageValence;
  elevation?: Elevation;
};

export const messageRoot: ComponentFunction<MessageStyleProps> = ({ valence }, etc) => {
  return mx('grid grid-cols-[min-content_1fr] gap-x-2 p-trimSm rounded-md', messageValence(valence), etc);
};

export const messageHeader: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-span-2 grid grid-cols-subgrid items-center', etc);
};

export const messageTitle: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-2 text-lg flex gap-trimSm', etc);
};

export const messageIcon: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-1', etc);
};

export const messageContent: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-span-2 grid grid-cols-subgrid col-start-2 first:font-medium', etc);
};

export const messageTheme: Theme<MessageStyleProps> = {
  root: messageRoot,
  header: messageHeader,
  icon: messageIcon,
  title: messageTitle,
  content: messageContent,
};
