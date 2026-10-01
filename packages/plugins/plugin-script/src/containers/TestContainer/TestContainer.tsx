//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import type * as Script from '@dxos/compute/Script';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { FunctionsServiceClient } from '@dxos/edge-compute';
import { Next } from '@dxos/react-ui/next';

import { TestPanel } from '#components';
import { useDeployDeps } from '#hooks';

export type TestContainerProps = {
  role: string;
  script: Script.Script;
};

export const TestContainer = ({ role, script }: TestContainerProps) => {
  const { client, fn, existingFunctionId } = useDeployDeps({ script });
  const spaceId = Obj.getDatabase(script)?.spaceId;

  const functionsClient = useMemo(() => FunctionsServiceClient.fromClient(client), [client]);

  const handleInvoke = useCallback(
    async (input: unknown) => {
      if (!fn) {
        throw new Error('Function not deployed');
      }
      return functionsClient.invoke(Context.default(), fn, input, { spaceId });
    },
    [fn, functionsClient, spaceId],
  );

  return (
    <Next.Panel.Root role={role} width='document'>
      <Next.Panel.Body asChild>
        <TestPanel onInvoke={existingFunctionId ? handleInvoke : undefined} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

TestContainer.displayName = 'TestContainer';
