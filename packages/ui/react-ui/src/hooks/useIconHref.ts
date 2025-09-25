//
// Copyright 2025 DXOS.org
//

import { useThemeContext } from './useThemeContext';

const ICONS_URL = '/icons.svg';

export const useIconHref = (icon?: string) => {
  const { noCache, iconsUrl } = useThemeContext();
  const baseUrl = iconsUrl ?? ICONS_URL;
  const url = noCache ? `${baseUrl}?nocache=${new Date().getMinutes()}` : baseUrl;
  return icon ? `${url}#${icon}` : undefined;
};
