//
// Copyright 2023 DXOS.org
//

import { safeStringify } from '@dxos/util';
import React from 'react';

export type LoadingProps = { data?: any };

export const Loading = ({ data }: LoadingProps) => {
  return (
    <div>
      <p>Loading...</p>
      <pre>{safeStringify(data, undefined, 2)}</pre>
    </div>
  );
};
