//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { Filter } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { ScriptCapabilities, ScriptContainer as ScriptContainerComponent, meta } from '@dxos/plugin-script';
import { type ScriptSettings } from '@dxos/plugin-script/types';
import { useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const ScriptModule = ({ space }: ComponentProps) => {
  const [script] = useQuery(space.db, Filter.type(Script.Script));
  const compiler = useCapability(ScriptCapabilities.Compiler);
  const settings = useCapability(Capabilities.SettingsStore).getStore<ScriptSettings>(meta.id)?.value;
  if (!script) {
    return null;
  }

  return (
    <div className='flex is-full bs-[70vh] min-bs-[20rem] overflow-auto'>
      <ScriptContainerComponent role={'section'} script={script} settings={settings} env={compiler.environment} />
    </div>
  );
};
