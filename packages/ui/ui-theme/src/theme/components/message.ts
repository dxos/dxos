//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type MessageValence, type Theme } from '@dxos/ui-types';

import { mx, messageValence } from '../../util';

export type MessageStyleProps = {
  valence?: MessageValence;
  elevation?: Elevation;
};

export const messageRoot: ComponentFunction<MessageStyleProps> = ({ valence }, etc) => {
  return mx('grid grid-cols-[2rem_1fr_2rem] p-1 rounded-sm', messageValence(valence), etc);
};

export const messageHeader: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-span-full grid grid-cols-subgrid items-center', etc);
};

export const messageTitle: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-2 truncate', etc);
};

export const messageIcon: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-1 grid place-items-center', etc);
};

export const messageContent: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-2 grid grid-cols-subgrid first:font-medium', etc);
};

export const messageTheme: Theme<MessageStyleProps> = {
  root: messageRoot,
  header: messageHeader,
  icon: messageIcon,
  title: messageTitle,
  content: messageContent,
};
