//
// Copyright 2023 DXOS.org
//

import { themeVariantSubduedFocus } from '../../styles';
import { mx } from '../../util';
import { ThemeContextValue } from '../ThemeProvider';

export const defaultDropdownMenuItem = (themeVariant: ThemeContextValue['themeVariant']) => {
  return mx(
    'flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-xs',
    'text-neutral-400 hover:bg-neutral-50 dark:text-neutral-500 dark:hover:bg-neutral-900',
    themeVariantSubduedFocus(themeVariant)
  );
};
