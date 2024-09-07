//
// Copyright 2022 DXOS.org
//

import { type ThemeMode } from '@dxos/react-ui';

export const defaultGridStyles = (themeMode: ThemeMode) =>
  themeMode === 'dark'
    ? '[&>path.axis]:stroke-neutral-600 [&>path.major]:stroke-neutral-700 [&>path.minor]:stroke-neutral-750'
    : '[&>path.axis]:stroke-neutral-400 [&>path.major]:stroke-neutral-300 [&>path.minor]:stroke-neutral-250';
