//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Script } from '@dxos/functions';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { Panel } from '@dxos/react-ui';
import { getSpace } from '@dxos/react-client/echo';

import { TestPanel } from '../../components';
import { useDeployDeps } from '../../hooks';

export type TestContainerProps = {
  role: string;
  script: Script.Script;
};

export const TestContainer = ({ role, script }: TestContainerProps) => {
  const { client, fn, existingFunctionId } = useDeployDeps({ script });
  const space = getSpace(script);

  const functionsClient = useMemo(() => FunctionsServiceClient.fromClient(client), [client]);

  const handleInvoke = useCallback(
    async (input: unknown) => {
      if (!fn) {
        throw new Error('Function not deployed');
      }
      return functionsClient.invoke(fn, input, { spaceId: space?.id });
    },
    [fn, functionsClient, space?.id],
  );

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <TestPanel onInvoke={existingFunctionId ? handleInvoke : undefined} />
      </Panel.Content>
    </Panel.Root>
  );
};
