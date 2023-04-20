//
// Copyright 2022 DXOS.org
//

import {ThemeVariant} from "../props";

export const hover = (
  { disabled }: { disabled?: boolean } = {},
  themeVariant: ThemeVariant = 'app'
) => {
  return (
    !disabled &&
    (themeVariant === 'os'
      ? 'transition-colors duration-100 linear hover:bg-white/75 dark:hover:bg-neutral-750/75'
      : 'transition-colors duration-100 linear hover:text-black dark:hover:text-white hover:bg-neutral-25 dark:hover:bg-neutral-750')
  );
};
