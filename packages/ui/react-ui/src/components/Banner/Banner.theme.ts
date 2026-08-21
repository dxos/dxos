//
// Copyright 2023 DXOS.org
//

import { messageValence, mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type MessageValence, type Theme } from '@dxos/ui-types';

export type BannerStyleProps = {
  valence?: MessageValence;
  elevation?: Elevation;
};

// The grid itself comes from `Column.Root`; this fragment only supplies the valence surface.
const content: ComponentFunction<BannerStyleProps> = ({ valence }, etc) => {
  return mx('rounded-sm', messageValence(valence), etc);
};

const header: ComponentFunction<BannerStyleProps> = (_, etc) => {
  return mx('items-center', etc);
};

const title: ComponentFunction<BannerStyleProps> = (_, etc) => {
  return mx('col-start-2 overflow-hidden truncate', etc);
};

const body: ComponentFunction<BannerStyleProps> = (_, etc) => {
  return mx('col-start-2 flex flex-col first:font-medium pb-1.5', etc);
};

export const bannerTheme: Theme<BannerStyleProps> = {
  content,
  header,
  title,
  body,
};
