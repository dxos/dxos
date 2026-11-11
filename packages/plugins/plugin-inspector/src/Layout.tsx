//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ReactNode, useEffect, useState } from 'react';

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import { usePluginManager } from '@dxos/app-framework/PluginManagerProvider';
import { type Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { useSpaces } from '@dxos/react-client/echo';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { useInspectedPlugin } from './hooks.ts';
import { AppGraphPanel } from './panels/AppGraphPanel.tsx';
import { OperationsPanel } from './panels/OperationsPanel.tsx';
import { PluginPanel } from './panels/PluginPanel.tsx';
import { SurfacesPanel } from './panels/SurfacesPanel.tsx';
import { TranslationsPanel } from './panels/TranslationsPanel.tsx';
import { TypesPanel } from './panels/TypesPanel.tsx';

export type PanelId = 'graph' | 'operations' | 'plugin' | 'surfaces' | 'translations' | 'types';

const PANELS: { id: PanelId; label: string }[] = [
  { id: 'plugin', label: 'Plugin' },
  { id: 'translations', label: 'Translations' },
  { id: 'types', label: 'Types' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'operations', label: 'Operations' },
  { id: 'graph', label: 'App graph' },
];

export type LayoutProps = {
  /** Key of the plugin to inspect. */
  pluginId: string;
  /** The panel shown first. */
  panel?: PanelId;
  /** What an empty panel says, e.g. which page fills it. */
  empty?: Partial<Record<PanelId, ReactNode>>;
};

/** The panel each kind of contribution shows in, and the object the panels share. */
export const Layout = ({ pluginId, panel: initial = 'plugin', empty = {} }: LayoutProps) => {
  const [panel, setPanel] = useState<PanelId>(initial);
  const [subject, setSubject] = useState<Obj.Unknown>();
  const [space] = useSpaces();
  useActivateAll(pluginId);
  const props = { pluginId, empty: empty[panel] ?? 'Nothing contributed yet.' };

  return (
    <div className='grid grid-rows-[auto_minmax(0,1fr)] h-full min-h-0'>
      <div className='border-b border-separator'>
        <Toolbar.Root>
          <ToggleGroup.Root
            type='single'
            value={panel}
            onValueChange={(value) => setPanel((current) => PANELS.find(({ id }) => id === value)?.id ?? current)}
            rovingFocus={false}
          >
            {PANELS.map(({ id, label }) => (
              <ToggleGroup.Item key={id} value={id} label={label} variant='ghost' />
            ))}
          </ToggleGroup.Root>
        </Toolbar.Root>
      </div>
      <div className='overflow-auto p-2'>
        {panel === 'plugin' && <PluginPanel {...props} />}
        {panel === 'translations' && <TranslationsPanel {...props} />}
        {panel === 'types' && <TypesPanel {...props} space={space} subject={subject} onSelect={setSubject} />}
        {panel === 'surfaces' && <SurfacesPanel {...props} subject={subject} />}
        {panel === 'operations' && <OperationsPanel {...props} space={space} subject={subject} />}
        {panel === 'graph' && <AppGraphPanel {...props} />}
      </div>
    </div>
  );
};

/**
 * Fires every event the plugin's modules activate on. Composer fires each on demand, e.g. when a surface for a role first
 * renders; the inspector shows all of them, so it wants every module loaded, or failed with the reason.
 */
const useActivateAll = (pluginId: string) => {
  const manager = usePluginManager();
  const plugin = useInspectedPlugin(pluginId);
  useEffect(() => {
    const events = (plugin?.modules ?? []).flatMap((module) =>
      ActivationEvent.getEvents(module.activation.activatesOn),
    );
    // A module that fails is recorded with its error, so the failure needs no handling here.
    EffectEx.runDetached(
      Effect.forEach(events, (event) => manager.activate(event).pipe(Effect.catch(() => Effect.void)), {
        discard: true,
      }),
    );
  }, [manager, plugin]);
};
