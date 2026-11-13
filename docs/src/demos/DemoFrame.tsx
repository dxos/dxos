//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN, type SpaceId } from '@dxos/keys';
import { ClientPluginManager } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { ClientProvider } from '@dxos/react-client';
import { useSpace } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import * as Input from '@dxos/react-ui/Input';
import * as Select from '@dxos/react-ui/Select';
import * as Theme from '@dxos/react-ui/Theme';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type Demo } from './Demo.ts';
import { DemoRuntime, type Peer, PEERS, type RuntimeState } from './runtime.ts';

/** Stands in for the deck's layout operations, which plugins invoke and a bare surface lacks. */
const DemoStagePlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.echo-demos.stage'), name: 'Demo Stage' }),
).pipe(
  Plugin.addModule(
    Capability.inlineModule('DemoLayoutOperations', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void),
            Operation.withHandler(LayoutOperation.ScrollIntoView, () => Effect.void),
          ),
        ),
      ]),
    ),
  ),
  Plugin.make,
);

type Layout = 'one' | 'two';

/** A demo's two peers, with a toolbar to show one or both. */
export const DemoFrame = ({ demo, runtime }: { demo: Demo; runtime: DemoRuntime }) => {
  const state = useSyncExternalStore(runtime.subscribe, runtime.getState);
  const [layout, setLayout] = useState<Layout>(demo.layout.length > 1 ? 'two' : 'one');
  const [views, setViews] = useState<string[]>(() => PEERS.map((_, index) => demo.layout[index] ?? demo.layout[0]));

  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode='dark'>
      <div className='grid grid-rows-[auto_minmax(0,1fr)] h-full border border-separator rounded-md overflow-hidden bg-base-surface'>
        <Toolbar.Root>
          <span className='px-2 font-medium'>{demo.title}</span>
          <Toolbar.Separator variant='gap' />
          {state.error && <span className='px-2 text-error-text truncate'>{state.error}</span>}
          <Toolbar.ToggleGroup
            type='single'
            value={layout}
            onValueChange={(value: string) => value && setLayout(value as Layout)}
            aria-label='Peers shown'
          >
            <ToggleGroup.Item value='one' icon='ph--square--regular' label='One peer' iconOnly />
            <ToggleGroup.Item value='two' icon='ph--columns--regular' label='Two peers' iconOnly />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
        <div className={`grid min-h-0 gap-px bg-separator ${layout === 'two' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {PEERS.map((peer, index) => (
            <PeerPane
              key={peer.name}
              demo={demo}
              runtime={runtime}
              state={state}
              index={index}
              peer={peer}
              view={views[index]}
              onViewChange={(view) => setViews((views) => views.map((current, i) => (i === index ? view : current)))}
              hidden={layout === 'one' && index > 0}
            />
          ))}
        </div>
      </div>
    </Theme.Provider>
  );
};

type PeerPaneProps = {
  demo: Demo;
  runtime: DemoRuntime;
  state: RuntimeState;
  index: number;
  peer: Peer;
  view: string;
  onViewChange: (view: string) => void;
  hidden: boolean;
};

/** One peer: its client under this demo's plugin app, kept mounted while hidden so it stays in sync. */
const PeerPane = ({ demo, runtime, state, index, peer, view, onViewChange, hidden }: PeerPaneProps) => {
  return (
    <div
      className={`grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] bg-base-surface ${hidden ? 'hidden' : ''}`}
      inert={hidden}
    >
      {/*
        Throttled background tabs miss the status heartbeat; `suspend` skips the status gate so ClientPlugin
        never unmounts and destroys the runtime-owned client.
      */}
      <ClientProvider client={runtime.clients[index]} suspend>
        <PeerBar
          peer={peer}
          demo={demo}
          view={view}
          onViewChange={onViewChange}
          online={state.online[index]}
          onOnlineChange={(online) => runtime.setOnline(index, online)}
        />
        <ClientPluginManager
          id={`${demo.id}-${index}`}
          plugins={() => [
            ...CorePlugins.make(),
            StorybookPlugin.make({}),
            SpacePlugin.make({}),
            DemoStagePlugin(),
            ...demo.plugins(),
          ]}
        >
          {state.joined[index] && <PeerArticle spaceId={state.spaceId} subjectId={state.subjects?.[demo.id]?.[view]} />}
        </ClientPluginManager>
      </ClientProvider>
    </div>
  );
};

const PeerBar = ({
  peer,
  demo,
  view,
  onViewChange,
  online,
  onOnlineChange,
}: {
  peer: Peer;
  demo: Demo;
  view: string;
  onViewChange: (view: string) => void;
  online: boolean;
  onOnlineChange: (online: boolean) => void;
}) => {
  const items = Object.entries(demo.views).map(([value, label]) => ({ value, label: label ?? value }));

  return (
    <div
      className='flex items-center gap-2 px-3 py-1 text-sm border-b border-separator'
      style={{ borderTop: `3px solid var(--color-${peer.hue}-border)` }}
    >
      <span className='inline-block size-2.5 rounded-full' style={{ background: `var(--color-${peer.hue}-border)` }} />
      <span className='font-medium'>{peer.name}</span>
      {items.length > 1 && (
        <Select.Root items={items} value={[view]} onValueChange={({ value }) => value[0] && onViewChange(value[0])}>
          <Select.Trigger aria-label='View' fixed classNames='w-auto' />
          <Select.Content>
            {items.map((item) => (
              <Select.Item key={item.value} item={item} />
            ))}
          </Select.Content>
        </Select.Root>
      )}
      <span className='ms-auto' />
      <Input.Switch
        classNames='text-sm'
        label={online ? 'Online' : 'Offline'}
        checked={online}
        onCheckedChange={({ checked }) => onOnlineChange(checked)}
      />
    </div>
  );
};

/** The peer's replica of the subject, once the space and the object have reached it. */
const PeerArticle = ({ spaceId, subjectId }: { spaceId?: SpaceId; subjectId?: string }) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  // Plugins resolve links (a card's object, say) in the workspace's space, which is otherwise the peer's own.
  useEffect(() => {
    if (spaceId) {
      void invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(spaceId) });
    }
  }, [invokePromise, spaceId]);
  const space = useSpace(spaceId);
  const [subject] = useQuery(space?.db, subjectId ? Filter.id(subjectId) : Filter.nothing());
  const id = subject ? Obj.getURI(subject) : undefined;
  const attentionAttrs = useAttentionAttributes(id);
  const data = useMemo(() => ({ subject, attendableId: id ?? 'demo' }), [subject, id]);
  if (!subject) {
    return <div className='flex-1 grid place-items-center text-description'>Syncing…</div>;
  }

  return (
    <div className='dx-grow grid' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
    </div>
  );
};
