//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import { useCapability } from '@dxos/app-framework/Hooks';
import type * as Plugin from '@dxos/app-framework/Plugin';
import { usePluginManager } from '@dxos/app-framework/PluginManagerProvider';

import { useInspectedPlugin } from '../hooks.ts';
import { ModuleErrors } from '../InspectorPlugin.tsx';
import { todoStep } from '../todo.ts';
import { Empty, type PanelProps, Section, moduleName, shortName } from './common.tsx';

type Status = { label: string; detail?: string; tone: 'active' | 'failed' | 'waiting' };

const events = (module: Plugin.PluginModule): string =>
  ActivationEvent.getEvents(module.activation.activatesOn)
    .map((event) => shortName(String(event.id)))
    .join(', ');

const TONES: Record<Status['tone'], string> = {
  active: 'text-success-text',
  failed: 'text-error-text',
  waiting: 'text-description',
};

/** The plugin's metadata, and each module with its activation event and whether it is waiting, active or failed. */
export const PluginPanel = ({ pluginId, empty }: PanelProps) => {
  const manager = usePluginManager();
  const plugin = useInspectedPlugin(pluginId);
  const active = useAtomValue(manager.active);
  const failed = useAtomValue(manager.failed);
  const errors = useAtomValue(useCapability(ModuleErrors));

  if (!plugin) {
    return <Empty>{empty}</Empty>;
  }

  const statusOf = (module: Plugin.PluginModule): Status => {
    const error = errors[module.id];
    if (error) {
      const step = todoStep(error);
      return step
        ? { label: 'Not written yet', detail: step, tone: 'failed' }
        : { label: 'Failed', detail: error.message, tone: 'failed' };
    }
    return active.includes(module.id)
      ? { label: 'Active', tone: 'active' }
      : { label: 'Waiting', detail: `Activates on ${events(module)}`, tone: 'waiting' };
  };

  // A placeholder can fail a module of another plugin, e.g. a type the client registers.
  const elsewhere = Object.entries(errors).filter(
    ([moduleId, error]) => todoStep(error) && !plugin.modules.some((module) => module.id === moduleId),
  );
  const pluginFailure = failed.find((failure) => failure.id === pluginId && failure.phase === 'load');
  const { name, key, description } = plugin.meta.profile;

  return (
    <>
      <Section title={name ?? key}>
        <p className='text-sm font-mono'>{key}</p>
        {description && <p className='text-sm text-description'>{description}</p>}
        {pluginFailure && <p className='text-sm text-error-text'>{pluginFailure.error.message}</p>}
      </Section>
      <Section title='Modules'>
        {plugin.modules.length === 0 ? (
          <Empty>{empty}</Empty>
        ) : (
          <ul className='flex flex-col gap-1'>
            {plugin.modules.map((module) => {
              const status = statusOf(module);
              return (
                <li key={module.id} data-testid={`module-${moduleName(module.id)}`} className='text-sm'>
                  <span className='font-mono'>{moduleName(module.id)}</span>{' '}
                  <span className={TONES[status.tone]}>{status.label}</span>
                  {status.detail && <span className='block text-description'>{status.detail}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
      {elsewhere.length > 0 && (
        <Section title='Waiting on this plugin'>
          <ul className='flex flex-col gap-1'>
            {elsewhere.map(([moduleId, error]) => (
              <li key={moduleId} className='text-sm'>
                <span className='font-mono'>{moduleId}</span>
                <span className='block text-description'>{todoStep(error)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
};
