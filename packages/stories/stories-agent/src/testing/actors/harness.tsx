//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Filter, Obj, Query } from '@dxos/echo';
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

import { type ActorSpec } from './actor.ts';
import { type ActorFlow } from './flow.ts';
import { actorPresence } from './presence.ts';
import { Scene, type SceneMode } from './scene.ts';

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

type ActorContextValue = { scene: Scene; index: number; spec: ActorSpec };

const ActorContext = createContext<ActorContextValue | undefined>(undefined);

/** The actor whose client the calling component renders in. */
export const useActor = (): ActorContextValue => {
  const value = useContext(ActorContext);
  if (!value) {
    throw new Error('useActor must be used inside withActors');
  }
  return value;
};

const useScene = (scene: Scene) => useSyncExternalStore(scene.subscribe, () => `${scene.phase}:${scene.spaceId ?? ''}`);

export type WithActorsProps = {
  flow: ActorFlow;
  /** Shows each actor's name bar; off for clips that are framed by something else (the autocue Grid). */
  bars?: boolean;
};

/** Story args the harness reads; autocue's renderer sets `stepped` from the URL. */
export type ActorStoryArgs = {
  /** Hands time to `window.grid.seek` (autocue's frame renderer) instead of playing in real time. */
  stepped?: boolean;
};

/**
 * Story decorator: one client per actor of `flow`, each with its own identity and plugin app, all in one
 * shared space; the story renders once per actor, in a 2x2 (or N-cell) stage.
 */
export const withActors = ({ flow, bars = true }: WithActorsProps): Decorator<ActorStoryArgs> => {
  return (Story, { args }) => {
    const mode: SceneMode = args.stepped ? 'stepped' : 'realtime';
    const scene = useMemo(() => new Scene(flow, mode), [mode]);
    useEffect(() => {
      scene.open();
      return () => scene.dispose();
    }, [scene]);
    useScene(scene);

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
            <ClientProvider services={scene.services[index]}>
              <ClientPluginManager
                id={`actor-${index}`}
                clientOptions={{ types: TYPES, onClientInitialized: ({ client }) => scene.join(client, index) }}
                plugins={() => [
                  ...CorePlugins.make(),
                  StorybookPlugin.make({}),
                  SpacePlugin({}),
                  MarkdownPlugin.make(),
                  ReviewPlugin.make({ agentIdentity: { name: 'Review' } }),
                  StagePlugin({ hue: spec.hue }),
                ]}
              >
                <ActorContext.Provider value={{ scene, index, spec }}>
                  <Story />
                </ActorContext.Provider>
              </ClientPluginManager>
            </ClientProvider>
          </div>
        ))}
      </div>
    );
  };
};

const ActorBar = ({ spec, phase }: { spec: ActorSpec; phase: string }) => (
  <div
    className='flex items-center gap-2 px-3 py-1.5 text-sm font-medium border-b border-separator'
    style={{ borderTop: `3px solid var(--color-${spec.hue}-border)` }}
  >
    <span className='inline-block size-2.5 rounded-full' style={{ background: `var(--color-${spec.hue}-border)` }} />
    <span>{spec.name}</span>
    {spec.role && <span className='text-description font-normal'>{spec.role}</span>}
    {phase === 'joining' && <span className='ms-auto text-description font-normal'>Joining…</span>}
  </div>
);

/**
 * The shared document's article in the calling actor's own app, with the actor's companions beside it,
 * bound to the scene once its editor mounts so the actor's steps drive it.
 */
export const ActorArticle = () => {
  const { scene, index, spec } = useActor();
  const companions = spec.companions ?? NO_COMPANIONS;
  useScene(scene);
  const space = useSpace(scene.spaceId);
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const id = doc ? Obj.getURI(doc) : undefined;
  const attentionAttrs = useAttentionAttributes(id);
  const editorViews = Hooks.useCapability(MarkdownCapabilities.EditorViews);
  const { invokePromise } = Hooks.useOperationInvoker();

  useEffect(() => {
    if (!doc || !id || !space) {
      return;
    }

    // The registry is not reactive, so poll until the article has registered its view.
    const timer = setInterval(() => {
      const entry = editorViews.getByDocumentId(id);
      if (entry) {
        clearInterval(timer);
        scene.register(index, {
          view: entry.view,
          comment: async (anchor, text) => {
            const { error } = await invokePromise(CommentOperation.Create, {
              subject: doc,
              anchor,
              text,
              sender: { role: 'user', name: spec.name },
            });
            if (error) {
              throw error;
            }
          },
          reply: async (phrase, text) => {
            // The thread whose anchor spans `phrase` in this actor's own view.
            const anchors = await space.db.query(Query.select(Filter.id(doc.id)).targetOf(AnchoredTo.AnchoredTo)).run();
            const anchor = anchors.find((candidate) => {
              const range = candidate.anchor && Cursor.getRangeFromCursor(entry.view.state, candidate.anchor);
              return range && entry.view.state.sliceDoc(range.from, range.to) === phrase;
            });
            if (!anchor) {
              return false;
            }
            const { error } = await invokePromise(CommentOperation.AddMessage, {
              subject: doc,
              anchor,
              sender: { role: 'user', name: spec.name },
              text,
            });
            if (error) {
              throw error;
            }
            return true;
          },
        });
      }
    }, 100);
    return () => clearInterval(timer);
  }, [doc, id, space, editorViews, invokePromise, scene, index, spec]);

  const articleData = useMemo(() => ({ subject: doc, attendableId: id ?? 'actor' }), [doc, id]);
  const companionData = useMemo(
    () => companions.map((subject) => ({ subject, companionTo: doc, attendableId: id ?? 'actor' })),
    [companions, doc, id],
  );
  if (!doc || !id) {
    return <Loading />;
  }

  return (
    <Layout.Grid grow cols={companions.length ? [3, 2] : [1]} classNames='min-h-0' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={articleData} limit={1} />
      {companionData.map((data) => (
        <Surface.Surface key={data.subject} type={AppSurface.Article} data={data} limit={1} />
      ))}
    </Layout.Grid>
  );
};
