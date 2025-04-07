//
// Copyright 2025 DXOS.org
//

import { useThemeContext } from './useThemeContext';

const ICONS_URL = '/icons.svg';

export const useIconHref = (icon?: string) => {
  const { noCache } = useThemeContext();
  const url = noCache ? `${ICONS_URL}?nocache=${new Date().getMinutes()}` : ICONS_URL;
  return icon ? `${url}#${icon}` : undefined;
};
