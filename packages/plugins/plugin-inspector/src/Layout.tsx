//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import React, { type FC, type ReactNode, useEffect, useRef, useState } from 'react';

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Filter, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Select from '@dxos/react-ui/Select';
import { useTranslation } from '@dxos/react-ui/Theme';

import { useContributions, useInspectedPlugin } from './hooks.ts';
import { ModuleErrors } from './InspectorPlugin.tsx';
import { type Kind, type KindId, KINDS, kindOf } from './kinds.ts';
import { useDevPlugin } from './load.ts';
import { useCreateSample } from './sample.ts';
import { AppGraphView } from './views/AppGraphView.tsx';
import { type ViewProps, moduleName, shortName } from './views/common.tsx';
import { CreateObjectView } from './views/CreateObjectView.tsx';
import { OperationsView } from './views/OperationsView.tsx';
import { SchemaView } from './views/SchemaView.tsx';
import { SkillView } from './views/SkillView.tsx';
import { SurfaceView } from './views/SurfaceView.tsx';
import { TranslationsView } from './views/TranslationsView.tsx';

export type LayoutProps = {
  /** Key of a plugin the inspector was given; absent when it loads one from a dev server. */
  pluginId?: string;
  /** The dev server's manifest, for the reader's own plugin; loaded when the reader clicks Load dev plugin. */
  manifestUrl?: string;
  /** The kinds of module a learning-path page adds, checked against the loaded plugin. */
  adds?: readonly KindId[];
};

const VIEWS: Record<KindId, FC<ViewProps>> = {
  'app-graph': AppGraphView,
  'create-object': CreateObjectView,
  'operations': OperationsView,
  'schema': SchemaView,
  'skill': SkillView,
  'surface': SurfaceView,
  'translations': TranslationsView,
};

type Status = { tone: 'active' | 'failed' | 'waiting'; label: string; detail?: string };

const TONES: Record<Status['tone'], string> = {
  active: 'text-success-text',
  failed: 'text-error-text',
  waiting: 'text-description',
};

/** The workbench: a header with the plugin and the sample object, its modules in a sidebar, and the selected one. */
export const Layout = ({ pluginId: given, manifestUrl, adds }: LayoutProps) => {
  const dev = useDevPlugin(manifestUrl);
  const plugin = useInspectedPlugin(given ?? dev.pluginId);
  const [space] = useSpaces();
  useActivateAll(plugin);

  const source = (
    <>
      {manifestUrl && (
        <Button.Root
          label={dev.pluginId ? 'Reload' : 'Load dev plugin'}
          icon={dev.pluginId ? 'ph--arrow-clockwise--regular' : 'ph--plug--regular'}
          variant={dev.pluginId ? 'default' : 'primary'}
          disabled={dev.status === 'loading'}
          onClick={dev.pluginId ? dev.reload : dev.load}
        />
      )}
    </>
  );

  return plugin ? (
    <Workbench plugin={plugin} space={space} adds={adds} manifestUrl={manifestUrl} actions={source} />
  ) : (
    <Frame header={<Title manifestUrl={manifestUrl} />} actions={source}>
      <LoadPrompt manifestUrl={manifestUrl} loading={dev.status === 'loading'} error={dev.error} />
    </Frame>
  );
};

type FrameProps = { header: ReactNode; actions: ReactNode; children: ReactNode };

const Frame = ({ header, actions, children }: FrameProps) => (
  <div className='grid grid-rows-[auto_minmax(0,1fr)] dx-expand bg-base-surface'>
    <header className='flex flex-wrap items-center gap-2 px-3 py-2 border-b border-separator'>
      <div className='flex flex-col min-w-0 me-auto'>{header}</div>
      {actions}
    </header>
    {children}
  </div>
);

const Title = ({ plugin, manifestUrl }: { plugin?: Plugin.Plugin; manifestUrl?: string }) => (
  <>
    <span className='font-medium truncate'>{plugin?.meta.profile.name ?? 'Your plugin'}</span>
    <span className='text-xs text-description truncate'>
      {manifestUrl ? `Dev server · ${new URL(manifestUrl).host}` : 'Finished example'}
      {plugin && <span className='font-mono'> · {plugin.meta.profile.key}</span>}
    </span>
  </>
);

const LoadPrompt = ({ manifestUrl, loading, error }: { manifestUrl?: string; loading: boolean; error?: string }) => (
  <div className='flex flex-col items-center justify-center gap-2 p-6 text-center'>
    {manifestUrl ? (
      <>
        <p className='font-medium'>{loading ? 'Loading your plugin…' : 'Load your plugin from its dev server'}</p>
        <p className='text-sm text-description max-w-prose'>
          Run <code>vite</code> in your plugin's folder, then click <b>Load dev plugin</b>. The browser may ask to reach
          devices on your local network: allow it, since your plugin's code comes from your machine.
        </p>
        {error && <p className='text-sm text-error-text max-w-prose'>{error}</p>}
      </>
    ) : (
      <p className='text-sm text-description'>Loading…</p>
    )}
  </div>
);

type WorkbenchProps = {
  plugin: Plugin.Plugin;
  space?: Space;
  adds?: readonly KindId[];
  manifestUrl?: string;
  actions: ReactNode;
};

const Workbench = ({ plugin, space, adds, manifestUrl, actions }: WorkbenchProps) => {
  const statusOf = useStatus();
  const sample = useSample(plugin, space);
  const modules = [...plugin.modules].sort((a, b) => order(a) - order(b));
  const rows = sidebarRows(modules);
  const [selected, setSelected] = useState<string>();
  const current = modules.find((module) => module.id === selected) ?? modules[0];

  return (
    <Frame
      header={<Title plugin={plugin} manifestUrl={manifestUrl} />}
      actions={
        <>
          <SamplePicker plugin={plugin} space={space} {...sample} />
          {actions}
        </>
      }
    >
      <div className='grid grid-cols-[13rem_minmax(0,1fr)] min-h-0'>
        <nav className='flex flex-col gap-0.5 p-2 border-e border-separator overflow-auto'>
          <h2 className='px-2 pb-1 text-xs uppercase tracking-wide text-description'>Modules</h2>
          {rows.map((row) => {
            if (row.type === 'missing') {
              return (
                <span
                  key={row.kind.id}
                  className='flex items-center justify-between gap-2 px-2 py-1 text-sm text-description'
                  title='Not added yet'
                >
                  <span>{row.kind.label}</span>
                  <span className='text-xs'>○</span>
                </span>
              );
            }

            const module = row.module;
            const status = statusOf(module);
            return (
              <button
                key={module.id}
                data-testid={`module-${moduleName(module.id)}`}
                className={`flex items-center justify-between gap-2 px-2 py-1 rounded-md text-sm text-start ${module === current ? 'bg-active-surface' : 'hover:bg-hover-surface'}`}
                onClick={() => setSelected(module.id)}
              >
                <span className='truncate'>{row.kind?.label ?? moduleName(module.id)}</span>
                <span className={`text-xs ${TONES[status.tone]}`}>{status.tone === 'active' ? '●' : status.label}</span>
              </button>
            );
          })}
        </nav>
        <main className='flex flex-col gap-4 p-4 overflow-auto'>
          {adds && adds.length > 0 && <Adds adds={adds} modules={modules} statusOf={statusOf} />}
          {current ? (
            <ModuleDetail
              module={current}
              status={statusOf(current)}
              view={{
                moduleId: current.id,
                pluginKey: plugin.meta.profile.key,
                pluginModuleIds: plugin.modules.map((module) => module.id),
                space,
                ...sample,
              }}
            />
          ) : (
            <p className='text-sm text-description'>This plugin has no modules yet.</p>
          )}
        </main>
      </div>
    </Frame>
  );
};

type Row = { type: 'missing'; kind: Kind } | { type: 'module'; kind?: Kind; module: Plugin.PluginModule };

/** One row per kind in tutorial order, so modules turn green top to bottom; other modules follow. */
const sidebarRows = (modules: readonly Plugin.PluginModule[]): Row[] => [
  ...KINDS.flatMap((kind): Row[] => {
    const matches = modules.filter((module) => kindOf(module) === kind);
    return matches.length > 0
      ? matches.map((module) => ({ type: 'module', kind, module }))
      : [{ type: 'missing', kind }];
  }),
  ...modules.filter((module) => !kindOf(module)).map((module): Row => ({ type: 'module', module })),
];

const order = (module: Plugin.PluginModule): number => {
  const kind = kindOf(module);
  return kind ? KINDS.indexOf(kind) : KINDS.length;
};

type ModuleDetailProps = { module: Plugin.PluginModule; status: Status; view: ViewProps };

const ModuleDetail = ({ module, status, view }: ModuleDetailProps) => {
  const kind = kindOf(module);
  const View = kind ? VIEWS[kind.id] : undefined;
  return (
    <>
      <div className='flex flex-col gap-0.5'>
        <h2 className='text-lg font-medium'>{kind?.label ?? moduleName(module.id)}</h2>
        <p className='text-sm text-description'>
          <span className='font-mono'>{moduleName(module.id)}</span> ·{' '}
          <span className={TONES[status.tone]}>{status.label}</span>
          {status.detail && <span> · {status.detail}</span>}
        </p>
      </div>
      {status.tone !== 'failed' && View && <View {...view} />}
    </>
  );
};

type AddsProps = {
  adds: readonly KindId[];
  modules: readonly Plugin.PluginModule[];
  statusOf: (module: Plugin.PluginModule) => Status;
};

/** What the page adds, each checked against the loaded plugin. */
const Adds = ({ adds, modules, statusOf }: AddsProps) => (
  <section className='flex flex-col gap-1 p-3 rounded-md border border-dashed border-separator'>
    <h2 className='text-sm font-medium'>This page adds</h2>
    {KINDS.filter((kind) => adds.includes(kind.id)).map((kind) => {
      const module = modules.find((module) => kindOf(module) === kind);
      const status = module && statusOf(module);
      return (
        <p key={kind.id} className='text-sm'>
          {!status ? (
            <span className='text-description'>○ {kind.label}: not added yet</span>
          ) : status.tone === 'waiting' ? (
            <span className='text-description'>
              ○ {kind.label}: {status.detail}
            </span>
          ) : status.tone === 'failed' ? (
            <span className='text-error-text'>
              ✕ {kind.label}: {status.detail}
            </span>
          ) : (
            <span className='text-success-text'>✓ {kind.label}</span>
          )}
        </p>
      );
    })}
  </section>
);

/** Each module's status: active, waiting on its activation event, or failed with the reason. */
const useStatus = () => {
  const manager = PluginManagerProvider.usePluginManager();
  const active = useAtomValue(manager.active);
  const errors = useAtomValue(Hooks.useCapability(ModuleErrors));
  return (module: Plugin.PluginModule): Status => {
    const error = errors[module.id];
    if (error) {
      return { tone: 'failed', label: 'Failed', detail: error.message };
    }
    return active.includes(module.id)
      ? { tone: 'active', label: 'Active' }
      : {
          tone: 'waiting',
          label: 'Waiting',
          detail: `activates on ${ActivationEvent.getEvents(module.activation.activatesOn)
            .map((event) => shortName(String(event.id)))
            .join(', ')}`,
        };
  };
};

/** The sample object every module shows; each object created while the workbench is open becomes it. */
const useSample = (plugin: Plugin.Plugin, space: Space | undefined) => {
  const objects = usePluginObjects(plugin, space);
  const [sample, setSample] = useState<Obj.Unknown>();
  const seen = useRef<Set<string>>(undefined);
  useEffect(() => {
    const created = seen.current && objects.find((object) => !seen.current?.has(object.id));
    seen.current = new Set(objects.map((object) => object.id));
    setSample((current) => created ?? (current && objects.includes(current) ? current : objects[0]));
  }, [objects]);
  return { sample, onSample: setSample };
};

/** The objects in the space of the plugin's types. */
const usePluginObjects = (plugin: Plugin.Plugin, space: Space | undefined): Obj.Unknown[] => {
  const types = useContributions(
    plugin.modules.map((module) => module.id),
    AppCapabilities.Schema,
  ).flat();
  const filter = types.length > 0 ? Filter.or(...types.map((type) => Filter.type(type))) : undefined;
  return useQuery(filter ? space?.db : undefined, filter ?? Filter.nothing()).filter(Obj.isObject);
};

/** Picks the sample object, and creates one through the plugin's create-object contribution. */
type SamplePickerProps = {
  plugin: Plugin.Plugin;
  space?: Space;
  sample?: Obj.Unknown;
  onSample: (sample: Obj.Unknown) => void;
};

const SamplePicker = ({ plugin, space, sample, onSample }: SamplePickerProps): ReactNode => {
  const { t } = useTranslation();
  const objects = usePluginObjects(plugin, space);
  const [entry] = useContributions(
    plugin.modules.map((module) => module.id),
    SpaceCapabilities.CreateObjectEntry,
  );
  const { create } = useCreateSample(space);
  if (!entry && objects.length === 0) {
    return null;
  }

  const label = (object: Obj.Unknown): string =>
    Obj.getLabel(object) ?? t('object-name.placeholder', { ns: Obj.getTypename(object), defaultValue: object.id });

  return (
    <div className='flex items-center gap-1'>
      {objects.length > 0 && (
        <Select.Root
          items={objects.map((object) => ({ value: object.id, label: label(object) }))}
          value={sample ? [sample.id] : []}
          onValueChange={({ value }) => {
            const picked = objects.find((object) => object.id === value[0]);
            if (picked) {
              onSample(picked);
            }
          }}
        >
          <Select.Trigger placeholder='Sample object' aria-label='Sample object' />
          <Select.Content>
            {objects.map((object) => (
              <Select.Item key={object.id} item={{ value: object.id, label: label(object) }} />
            ))}
          </Select.Content>
        </Select.Root>
      )}
      {entry && <Button.Root label='New' icon='ph--plus--regular' disabled={!space} onClick={() => create(entry)} />}
    </div>
  );
};

/**
 * Fires every event the plugin's modules activate on. Composer fires each on demand, e.g. when a surface for a role first
 * renders; the inspector shows all of them, so it wants every module loaded, or failed with the reason.
 */
const useActivateAll = (plugin: Plugin.Plugin | undefined) => {
  const manager = PluginManagerProvider.usePluginManager();
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
