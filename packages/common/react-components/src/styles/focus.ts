//
// Copyright 2022 DXOS.org
//

import { ThemeContextValue } from '../components';

/**
 * @deprecated
 */
export const defaultFocus =
  'focus:outline-none focus-visible:z-[1] focus-visible:hover:outline-none dark:focus-visible:hover:outline-none focus-visible:ring focus-visible:ring-offset-1 focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-primary-200 dark:focus-visible:ring-offset-black';

/**
 * @deprecated
 */
export const osFocus =
  'focus:outline-none focus-visible:z-[1] focus-visible:hover:outline-none dark:focus-visible:hover:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-primary-300 dark:focus-visible:ring-offset-black';

export const themeVariantFocus = (themeVariant: ThemeContextValue['themeVariant']) =>
  themeVariant === 'os' ? osFocus : defaultFocus;

export const staticFocus =
  'ring ring-offset-1 ring-primary-500 ring-offset-white dark:ring-primary-200 dark:ring-offset-black';
