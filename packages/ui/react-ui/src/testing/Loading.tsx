//
// Copyright 2023 DXOS.org
//

import React, { captureOwnerStack, useEffect, useState } from 'react';

import { mx } from '@dxos/ui-theme';
import { safeStringify } from '@dxos/util';

import { ErrorStack } from '../next/components/ErrorFallback/ErrorFallback.tsx';
import { parseCaptureOwnerStack } from '../next/components/ErrorFallback/parse-stack.ts';

export type LoadingProps = { data?: any };

/**
 * Storybook loading component.
 */
export const Loading = ({ data }: LoadingProps) => {
  const [visible, setVisible] = useState(false);
  // React exports `captureOwnerStack` only from its development build; a production Storybook has none.
  const ownerFrames = parseCaptureOwnerStack(typeof captureOwnerStack === 'function' ? captureOwnerStack() : null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className='grid p-2'>
      <div
        className={mx(
          'flex flex-col w-full p-2 border-2 border-teal-500 rounded-md',
          'opacity-0 transition delay-1000 duration-1000',
          'overflow-auto',
          visible && 'opacity-100',
        )}
      >
        <h2 className='uppercase capitalize text-xs'>Loading State</h2>
        <pre className='text-sm text-fg-muted'>{safeStringify(data, undefined, 2)}</pre>

        <h3 className='uppercase capitalize text-xs mt-2'>Owner stack</h3>
        {ownerFrames && ownerFrames.length > 0 ? (
          <ErrorStack frames={ownerFrames} />
        ) : (
          <p className='text-xs text-fg-subtle'>No owner stack (production build or unsupported context).</p>
        )}
      </div>
    </div>
  );
};
