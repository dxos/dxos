//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

/**
 * Story renderer wrapper.
 */
export const render =
  <T extends Record<string, any>>(Story: FC<T>) =>
  (args: unknown) => {
    const result = <Story {...(args as T)} />;
    return result ?? <div />;
  };
