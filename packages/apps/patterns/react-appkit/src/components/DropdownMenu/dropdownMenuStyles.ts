//
// Copyright 2023 DXOS.org
//

import { themeVariantSubduedFocus } from '../../styles';
import { mx } from '../../util';
import { ThemeContextValue } from '../ThemeProvider';

export const defaultDropdownMenuItem = (themeVariant: ThemeContextValue['themeVariant']) => {
  return mx(
    'flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm',
    'text-neutral-900 data-[highlighted]:bg-neutral-50 dark:text-neutral-100 dark:data-[highlighted]:bg-neutral-900',
    themeVariantSubduedFocus(themeVariant)
  );
};
