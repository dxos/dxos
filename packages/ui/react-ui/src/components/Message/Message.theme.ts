//
// Copyright 2023 DXOS.org
//

import { messageValence, mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type MessageValence, type Theme } from '@dxos/ui-types';

export type MessageStyleProps = {
  valence?: MessageValence;
  elevation?: Elevation;
};

const root: ComponentFunction<MessageStyleProps> = ({ valence }, etc) => {
  return mx('p-1 rounded-sm', messageValence(valence), etc);
};

// Subgrid rather than a plain block so a nested `Message.Title` row still reaches the root's gutters.
const content: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-span-full grid grid-cols-subgrid p-trim-md', etc);
};

const header: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('items-center', etc);
};

const title: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-2 overflow-hidden truncate', etc);
};

const body: ComponentFunction<MessageStyleProps> = (_, etc) => {
  return mx('col-start-2 flex flex-col first:font-medium pb-1.5', etc);
};

export const messageTheme: Theme<MessageStyleProps> = {
  root,
  content,
  header,
  title,
  body,
};
