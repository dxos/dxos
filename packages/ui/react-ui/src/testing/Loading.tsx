//
// Copyright 2023 DXOS.org
//

import React, { captureOwnerStack, useEffect, useMemo, useState } from 'react';

import { mx } from '@dxos/ui-theme';
import { safeStringify } from '@dxos/util';

import { ErrorStack, parseCaptureOwnerStack } from '../components';

export type LoadingProps = { data?: any };

/**
 * Storybook loading component.
 */
export const Loading = ({ data }: LoadingProps) => {
  const [visible, setVisible] = useState(false);
  const callSite = useMemo(() => new Error(), []);
  const ownerFrames = parseCaptureOwnerStack(captureOwnerStack());

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={mx(
        'flex flex-col w-full p-2 m-2 border-2 border-teal-500 rounded-md',
        'opacity-0 transition delay-1000 duration-1000',
        visible && 'opacity-100',
      )}
    >
      <h2 className='uppercase capitalize text-xs'>Loading State</h2>
      <pre className='text-sm text-description'>{safeStringify(data, undefined, 2)}</pre>

      <h3 className='uppercase capitalize text-xs mt-2'>Owner stack</h3>
      {ownerFrames && ownerFrames.length > 0 ? (
        <ErrorStack frames={ownerFrames} />
      ) : (
        <p className='text-xs text-subdued'>No owner stack (production build or unsupported context).</p>
      )}
    </div>
  );
};
