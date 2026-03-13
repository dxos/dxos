//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { safeStringify } from '@dxos/util';
import React, { useEffect, useState } from 'react';

export type LoadingProps = { data?: any };

/**
 * Storybook loading component.
 */
export const Loading = ({ data }: LoadingProps) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={mx('flex flex-col opacity-0 transition delay-1000 duration-1000', visible && 'opacity-100')}>
      <h2 className='uppercase'>Loading</h2>
      <pre>{safeStringify(data, undefined, 2)}</pre>
    </div>
  );
};
