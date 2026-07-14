//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React from 'react';

import { type Capability } from '@dxos/app-framework';
import { useOptionalCapabilities } from '@dxos/app-framework/ui';
import { Script } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { ScriptCapabilities } from '@dxos/plugin-script';
import { ScriptArticle } from '@dxos/plugin-script/containers';
import { useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { type ModuleProps } from '@dxos/story-modules';

/** Value type contributed by a capability interface definition. */
type CapabilityValue<D> = D extends Capability.InterfaceDef<infer T> ? T : never;

export const ScriptModule = ({ space }: ModuleProps) => {
  const [script] = useQuery(space.db, Filter.type(Script.Script));
  // Read optionally: the ScriptPlugin capabilities are absent until the plugin activates, so the
  // throwing `useCapability`/`useAtomCapability` would crash the surface during that window.
  const [compiler] = useOptionalCapabilities(ScriptCapabilities.Compiler);
  const [settingsAtom] = useOptionalCapabilities(ScriptCapabilities.Settings);
  if (!script || !compiler || !settingsAtom) {
    return null;
  }

  return <ScriptContent script={script} compiler={compiler} settingsAtom={settingsAtom} />;
};

type ScriptContentProps = {
  script: Script.Script;
  compiler: CapabilityValue<typeof ScriptCapabilities.Compiler>;
  settingsAtom: CapabilityValue<typeof ScriptCapabilities.Settings>;
};

// Inner component so `useAtomValue` runs unconditionally once the capabilities have resolved.
const ScriptContent = ({ script, compiler, settingsAtom }: ScriptContentProps) => {
  const settings = useAtomValue(settingsAtom);
  return (
    <Panel.Root>
      <Panel.Content classNames='flex w-full min-h-[20rem] overflow-auto'>
        <ScriptArticle role='section' subject={script} settings={settings} env={compiler.environment} />
      </Panel.Content>
    </Panel.Root>
  );
};
