//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

/**
 * Story renderer wrapper.
 */
export const render =
  <T,>(r: FC<T>) =>
  (args: T) => <>{r(args) ?? <div />}</>;
