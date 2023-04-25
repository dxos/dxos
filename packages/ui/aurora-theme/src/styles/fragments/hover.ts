//
// Copyright 2022 DXOS.org
//

import { ThemeVariant } from '@dxos/aurora-types';

export const appHover =
  'transition-colors duration-100 linear hover:text-black dark:hover:text-white hover:bg-neutral-25 dark:hover:bg-neutral-750';
export const osHover = 'transition-colors duration-100 linear hover:bg-white/75 dark:hover:bg-neutral-750/75';

/**
 * @deprecated use {@link bindTheme} instead.
 */
export const hover = ({ disabled }: { disabled?: boolean } = {}, themeVariant: ThemeVariant = 'app') => {
  return !disabled && (themeVariant === 'os' ? osHover : appHover);
};
