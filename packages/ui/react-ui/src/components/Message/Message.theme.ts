//
// Copyright 2023 DXOS.org
//

import { mx, messageValence } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type MessageValence, type Theme } from '@dxos/ui-types';

export type MessageStyleProps = {
  valence?: MessageValence;
  elevation?: Elevation;
};

const root: ComponentFunction<MessageStyleProps> = ({ valence }, etc) => {
  return mx('grid grid-cols-[2rem_1fr_2rem] p-1 rounded-sm', messageValence(valence), etc);
};

const header: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-span-full grid grid-cols-subgrid items-center', etc);
};

const title: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-2 overflow-hidden truncate', etc);
};

const icon: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-1 grid place-items-center', etc);
};

const content: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-2 grid grid-cols-subgrid inline first:font-medium', etc);
};

export const messageTheme: Theme<MessageStyleProps> = {
  root,
  header,
  icon,
  title,
  content,
};
