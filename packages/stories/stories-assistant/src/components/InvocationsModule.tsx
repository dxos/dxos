//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { InvocationTraceContainer } from '@dxos/devtools';
import { EchoId } from '@dxos/keys';

import { type ComponentProps } from './types';

export const InvocationsModule = ({ space }: ComponentProps) => {
  const legacyDxn = space?.properties.invocationTraceQueue?.dxn;
  const queueDxn = useMemo(() => {
    if (!legacyDxn) return undefined;
    const echoDxn = legacyDxn.asEchoDXN();
    return echoDxn?.spaceId && echoDxn?.echoId
      ? EchoId.fromSpaceAndObjectId(echoDxn.spaceId, echoDxn.echoId as any)
      : undefined;
  }, [legacyDxn]);
  return (
    <div className='flex h-full min-h-[20rem] items-center justify-center'>
      <InvocationTraceContainer db={space?.db} queueDxn={queueDxn} detailAxis='block' />
    </div>
  );
};
