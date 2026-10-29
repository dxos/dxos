//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type ClientServicesProvider } from '@dxos/client';
import { fromHost } from '@dxos/client/local';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Filter, Obj, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { ClientPluginManager } from '@dxos/plugin-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import * as CommentOperation from '@dxos/plugin-review/CommentOperation';
import * as ReviewPlugin from '@dxos/plugin-review/ReviewPlugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { ClientProvider } from '@dxos/react-client';
import { useSpace } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import * as Layout from '@dxos/react-ui/Layout';
import { Loading } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';
import { Cursor } from '@dxos/ui-editor';

import { storyConfig } from '../config.ts';
import { defaultEdgeEnvironment } from '../story-settings.ts';
import { type ActorBinding, type ActorSpec, type ThreadMatch } from './actor.ts';
import { type ActorFlow } from './flow.ts';
import { actorPresence } from './presence.ts';
import { Scene, type SceneMode, type SceneView } from './scene.ts';

const NO_COMPANIONS: string[] = [];

const TYPES = [Markdown.Document, Text.Text, Thread.Thread, Message.Message, AnchoredTo.AnchoredTo];

/**
 * Per-actor stage plugin: stands in for the deck's layout operations, which comment creation invokes and
 * a bare surface lacks, and gives the actor's editor its presence.
 */
const StagePlugin = Plugin.define<{ hue: string }>(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.stories-agent.actors.stage'), name: 'Actor Stage' }),
).pipe(
  Plugin.addModule(
    Capability.inlineModule('StageLayoutOperations', { provides: [Capabilities.OperationHandler] }, () =>
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
  Plugin.addModule(({ hue }: { hue: string }) => ({
    id: 'presence',
    provides: [MarkdownCapabilities.ExtensionProvider],
    activate: () =>
      Effect.succeed([Capability.contribute(MarkdownCapabilities.ExtensionProvider, [() => actorPresence(hue)])]),
  })),
  Plugin.make,
);

type ActorContextValue = { scene: SceneView; index: number; spec: ActorSpec };

const ActorContext = createContext<ActorContextValue | undefined>(undefined);

/** The actor whose client the calling component renders in. */
export const useActor = (): ActorContextValue => {
  const value = useContext(ActorContext);
  if (!value) {
    throw new Error('useActor must be used inside withActors');
  }
  return value;
};

const useScene = (scene: SceneView) =>
  useSyncExternalStore(scene.subscribe, () => `${scene.phase}:${scene.spaceId ?? ''}`);

export type WithActorsProps<T> = {
  flow: ActorFlow<T>;
  /** Shows each actor's name bar; off for clips that are framed by something else (the autocue Grid). */
  bars?: boolean;
};

/** Story args the harness reads; autocue's renderer sets `stepped` from the URL. */
export type ActorStoryArgs = {
  /** Hands time to `window.grid.seek` (autocue's frame renderer) instead of playing in real time. */
  stepped?: boolean;
  /**
   * Runs just this actor, in its own client on the real (dev EDGE) network: one browser per actor, driven together
   * by `tools/autocue/showcase/solo-scene.mjs`.
   */
  actor?: number;
};

/**
 * Story decorator: one client per actor of `flow`, each with its own identity and plugin app, all in one
 * shared space; the story renders once per actor, in a 2x2 (or N-cell) stage.
 */
export const withActors = <T,>({ flow, bars = true }: WithActorsProps<T>): Decorator<ActorStoryArgs> => {
  const types = [...TYPES, ...(flow.types ?? [])];
  return (Story, { args }) => {
    const mode: SceneMode = args.stepped ? 'stepped' : 'realtime';
    const solo = args.actor;
    const scene = useMemo(() => new Scene(flow, mode, solo), [mode, solo]);
    useEffect(() => {
      scene.open();
      return () => scene.dispose();
    }, [scene]);
    useScene(scene);

    const renderActor = (spec: ActorSpec, index: number, services: ClientServicesProvider) => (
      <ClientProvider services={services}>
        <ClientPluginManager
          id={`actor-${index}`}
          clientOptions={{ types, onClientInitialized: ({ client }) => scene.join(client, index) }}
          plugins={() => [
            ...CorePlugins.make(),
            StorybookPlugin.make({}),
            SpacePlugin.make({}),
            MarkdownPlugin.make(),
            ReviewPlugin.make({ agentIdentity: { name: 'Review' } }),
            StagePlugin({ hue: spec.hue }),
            ...(flow.plugins?.(spec, index) ?? []),
          ]}
        >
          <ActorContext.Provider value={{ scene, index, spec }}>
            <Story />
          </ActorContext.Provider>
        </ClientPluginManager>
      </ClientProvider>
    );

    if (solo !== undefined) {
      return (
        <SoloActor
          spec={flow.actors[solo]}
          bars={bars}
          phase={scene.phase}
          render={(services) => renderActor(flow.actors[solo], solo, services)}
        />
      );
    }

    const columns = Math.ceil(Math.sqrt(flow.actors.length));
    return (
      <div
        className={`dx-cover grid overflow-hidden ${bars ? 'gap-px bg-separator' : ''}`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: 'minmax(0, 1fr)' }}
      >
        {flow.actors.map((spec, index) => (
          <div
            key={index}
            className={`grid min-h-0 min-w-0 bg-base-surface ${bars ? 'grid-rows-[auto_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)]'}`}
          >
            {bars && <ActorBar spec={spec} phase={scene.phase} />}
            {renderActor(spec, index, scene.services[index])}
          </div>
        ))}
      </div>
    );
  };
};

/** One actor filling the page, in a client of its own on the real network (built once, asynchronously). */
const SoloActor = ({
  spec,
  bars,
  phase,
  render,
}: {
  spec: ActorSpec;
  bars: boolean;
  phase: string;
  render: (services: ClientServicesProvider) => React.ReactNode;
}) => {
  const [services, setServices] = useState<ClientServicesProvider>();
  useEffect(() => {
    let disposed = false;
    // Separate browsers need a real network; a fresh profile has no EDGE chosen, and local EDGE is rarely running.
    defaultEdgeEnvironment('dev');
    void fromHost(storyConfig({ persistent: false })).then((services) => {
      if (!disposed) {
        setServices(services);
      }
    });
    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div
      className={`dx-cover grid bg-base-surface ${bars ? 'grid-rows-[auto_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)]'}`}
    >
      {bars && <ActorBar spec={spec} phase={phase} />}
      {services ? render(services) : <Loading />}
    </div>
  );
};

const ActorBar = ({ spec, phase }: { spec: ActorSpec; phase: string }) => (
  <div
    className='flex items-center gap-2 px-3 py-1.5 text-sm font-medium border-b border-separator'
    style={{ borderTop: `3px solid var(--color-${spec.hue}-border)` }}
  >
    <span className='inline-block size-2.5 rounded-full' style={{ background: `var(--color-${spec.hue}-border)` }} />
    <span>{spec.name}</span>
    {spec.role && <span className='text-description font-normal'>{spec.role}</span>}
    {phase === 'joining' && <span className='ms-auto text-description font-normal'>Joining...</span>}
  </div>
);

/** Objects that open as an article, preferred over parts that share their name (a sheet's chart, a document's text). */
const ARTICLE_TYPES = [
  'org.dxos.type.document',
  'org.dxos.type.drawing',
  'org.dxos.type.sheet',
  'org.dxos.type.assistant.chat',
];

/** The object of `name`, preferring one that opens as an article. */
const byName = (objects: Obj.Unknown[], name: string): Obj.Unknown | undefined => {
  // Never the space's own properties, which carry the space's name and could share it.
  const named = objects.filter(
    (object) => Obj.getLabel(object) === name && Obj.getTypename(object) !== 'org.dxos.type.spaceProperties',
  );
  return named.find((object) => ARTICLE_TYPES.includes(Obj.getTypename(object) ?? '')) ?? named[0];
};

/**
 * The actor's subject (the flow's document unless the actor names another object) in the actor's own app,
 * with the actor's companions beside it, bound to the scene once it mounts so the actor's steps drive it.
 */
export const ActorArticle = () => {
  const { scene, index, spec } = useActor();
  const companions = spec.companions ?? NO_COMPANIONS;
  useScene(scene);
  const space = useSpace(scene.spaceId);
  const objects = useQuery(space?.db, Filter.everything());
  // Steps look objects up after the render that found them, so the lookup reads the latest results.
  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const name = spec.subject ?? scene.documentName;
  const subject = byName(objects, name);
  if (space) {
    scene.mark(index, 'space-visible');
  }
  if (subject) {
    scene.mark(index, 'subject');
  }
  scene.progress[index] = !space
    ? 'no space'
    : !subject
      ? `no "${name}" among ${objects.length}`
      : `${Obj.getTypename(subject)} found`;
  const id = subject ? Obj.getURI(subject) : undefined;
  const attentionAttrs = useAttentionAttributes(id);
  const editorViews = Hooks.useCapability(MarkdownCapabilities.EditorViews);
  const { invokePromise } = Hooks.useOperationInvoker();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!subject || !id || !space) {
      return;
    }

    const object = (name: string) => byName(objectsRef.current, name);
    const bind = (view?: ActorBinding['view']): ActorBinding | undefined =>
      root.current
        ? {
            root: root.current,
            view,
            object,
            comment: async ({ subject: target, anchor, text }) => {
              const commented = target ? object(target) : subject;
              if (!commented) {
                throw new Error(`${spec.name}: no object "${target}" to comment on`);
              }
              const { error } = await invokePromise(CommentOperation.Create, {
                subject: commented,
                anchor,
                text,
                sender: { role: 'user', name: spec.name },
              });
              if (error) {
                throw error;
              }
            },
            reply: async (match: ThreadMatch, text) => {
              const anchors = await space.db.query(Filter.type(AnchoredTo.AnchoredTo)).run();
              const anchor = anchors.find((candidate) => {
                if ('anchor' in match) {
                  return candidate.anchor === match.anchor;
                }
                if ('subject' in match) {
                  return !candidate.anchor && Obj.getLabel(Relation.getTarget(candidate)) === match.subject;
                }
                // The thread whose anchor spans the phrase in this actor's own view.
                const range = view && candidate.anchor && Cursor.getRangeFromCursor(view.state, candidate.anchor);
                return !!range && view.state.sliceDoc(range.from, range.to) === match.phrase;
              });
              if (!anchor) {
                return false;
              }
              const { error } = await invokePromise(CommentOperation.AddMessage, {
                subject: Relation.getTarget(anchor),
                anchor,
                sender: { role: 'user', name: spec.name },
                text,
              });
              if (error) {
                throw error;
              }
              return true;
            },
          }
        : undefined;

    // A document binds once its editor has mounted (the registry is not reactive, so it is polled); any other
    // subject binds once its view is in the page.
    const timer = setInterval(() => {
      const view = Obj.instanceOf(Markdown.Document, subject) ? editorViews.getByDocumentId(id)?.view : undefined;
      const binding = (view || !Obj.instanceOf(Markdown.Document, subject)) && bind(view);
      scene.progress[index] = binding ? 'bound' : `waiting for ${view ? 'root' : 'editor'}`;
      if (binding) {
        scene.mark(index, 'bound');
        clearInterval(timer);
        scene.register(index, binding);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [subject, id, space, editorViews, invokePromise, scene, index, spec]);

  const articleData = useMemo(() => ({ subject, attendableId: id ?? 'actor' }), [subject, id]);
  const companionData = useMemo(
    () => companions.map((companion) => ({ subject: companion, companionTo: subject, attendableId: id ?? 'actor' })),
    [companions, subject, id],
  );
  if (!subject || !id) {
    return <Loading />;
  }

  return (
    <div ref={root} className='contents'>
      <Layout.Grid grow cols={companions.length ? [3, 2] : [1]} classNames='min-h-0' {...attentionAttrs}>
        <Surface.Surface type={AppSurface.Article} data={articleData} limit={1} />
        {companionData.map((data) => (
          <Surface.Surface key={data.subject} type={AppSurface.Article} data={data} limit={1} />
        ))}
      </Layout.Grid>
    </div>
  );
};
