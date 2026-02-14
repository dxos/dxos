//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useAtomCapability, useCapability } from '@dxos/app-framework/ui';
import { Filter } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { ScriptCapabilities, ScriptContainer as ScriptContainerComponent } from '@dxos/plugin-script';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const ScriptModule = ({ space }: ComponentProps) => {
  const [script] = useQuery(space.db, Filter.type(Script.Script));
  const compiler = useCapability(ScriptCapabilities.Compiler);
  const settings = useAtomCapability(ScriptCapabilities.Settings);
  if (!script) {
    return null;
  }

  return (
    <div className='flex is-full bs-[70vh] min-bs-[20rem] overflow-auto'>
      <ScriptContainerComponent role={'section'} subject={script} settings={settings} env={compiler.environment} />
    </div>
  );
};
