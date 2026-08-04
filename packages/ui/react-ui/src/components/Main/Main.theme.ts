//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction } from '@dxos/ui-types';

import { mainPaddingTransitions } from './constants';

const padding = 'dx-main-content-padding';

export type MainStyleProps = Partial<{
  bounce: boolean;
  handlesFocus: boolean;
}>;

// The app canvas is the base zone: it paints the level and publishes `--surface-bg`, which every
// aspect inside it (bars, wells, hover/current rows) derives from.
const content: ComponentFunction<MainStyleProps> = ({ bounce }, ...etc) =>
  mx(
    padding,
    mainPaddingTransitions,
    bounce && 'dx-main-bounce-layout',
    'dx-base-surface',
    'dx-focus-ring-main',
    ...etc,
  );

const sidebar: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx('dx-main-sidebar', 'dx-focus-ring-inset-over-all', ...etc);

const overlay: ComponentFunction<MainStyleProps> = (_, ...etc) => mx('dx-main-overlay', ...etc);

export const mainTheme = {
  content,
  sidebar,
  overlay,
};
