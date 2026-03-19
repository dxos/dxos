//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Script } from '@dxos/functions';
import { Panel } from '@dxos/react-ui';

import { TestPanel } from '../../components';
import { useDeployDeps } from '../../hooks';
import { getFunctionUrl } from '../../util';

export type TestContainerProps = {
  role: string;
  script: Script.Script;
};

export const TestContainer = ({ role, script }: TestContainerProps) => {
  const { client, fn, existingFunctionId } = useDeployDeps({ script });
  const edgeUrl = client.config.values.runtime?.services?.edge?.url ?? '';

  const functionUrl = useMemo(() => {
    if (!existingFunctionId) {
      return undefined;
    }
    return getFunctionUrl({ script, fn, edgeUrl });
  }, [existingFunctionId, fn, script, edgeUrl]);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <TestPanel functionUrl={functionUrl} />
      </Panel.Content>
    </Panel.Root>
  );
};
