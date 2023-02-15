//
// Copyright 2022 DXOS.org
//

import { ThemeVariant } from '../components';

/**
 * @deprecated
 */
export const defaultFocus =
  'focus:outline-none focus-visible:z-[1] focus-visible:hover:outline-none dark:focus-visible:hover:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-primary-350 focus-visible:ring-offset-white dark:focus-visible:ring-primary-450 dark:focus-visible:ring-offset-black';

/**
 * @deprecated
 */
export const subduedFocus = 'focus:outline-none focus-visible:outline-none';

/**
 * @deprecated
 */
export const osFocus =
  'focus:outline-none focus-visible:z-[1] focus-visible:hover:outline-none dark:focus-visible:hover:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-primary-350 focus-visible:ring-offset-white dark:focus-visible:ring-primary-450 dark:focus-visible:ring-offset-black';

/**
 * @deprecated
 */
export const themeVariantFocus = (themeVariant: ThemeVariant) => (themeVariant === 'os' ? osFocus : defaultFocus);

/**
 * @deprecated
 */
export const themeVariantSubduedFocus = (themeVariant: ThemeVariant) =>
  themeVariant === 'os' ? osFocus : subduedFocus;

export const focus = (
  { variant, disabled }: { variant?: 'default' | 'subdued' | 'static'; disabled?: boolean } = {},
  themeVariant: ThemeVariant = 'app'
) => {
  return disabled
    ? ''
    : variant === 'static'
    ? staticFocus
    : variant === 'subdued'
    ? themeVariantSubduedFocus(themeVariant)
    : themeVariantFocus(themeVariant);
};

export const staticFocus =
  'ring-2 ring-offset-0 ring-primary-350 ring-offset-white dark:ring-primary-450 dark:ring-offset-black';
