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
  return mx('p-1 rounded-sm', messageValence(valence), etc);
};

const header: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('items-center', etc);
};

const title: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-2 overflow-hidden truncate text-lg', etc);
};

const icon: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-1 grid place-items-center', etc);
};

const close: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-3', etc);
};

const content: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-2 first:font-medium pb-1.5', etc);
};

export const messageTheme: Theme<MessageStyleProps> = {
  root,
  header,
  icon,
  title,
  close,
  content,
};
