//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useAtomCapability, useCapability } from '@dxos/app-framework/ui';
import { Script } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { ScriptCapabilities } from '@dxos/plugin-script';
import { ScriptArticle } from '@dxos/plugin-script/containers';
import { useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { type ModuleProps } from './types';

export const ScriptModule = ({ space }: ModuleProps) => {
  const [script] = useQuery(space.db, Filter.type(Script.Script));
  const compiler = useCapability(ScriptCapabilities.Compiler);
  const settings = useAtomCapability(ScriptCapabilities.Settings);
  if (!script) {
    return null;
  }

  return (
    <Panel.Root>
      <Panel.Content classNames='flex w-full min-h-[20rem] overflow-auto'>
        <ScriptArticle role='section' subject={script} settings={settings} env={compiler.environment} />
      </Panel.Content>
    </Panel.Root>
  );
};
