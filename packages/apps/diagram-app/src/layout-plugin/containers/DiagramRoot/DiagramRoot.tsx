//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as PluginManager from '@dxos/app-framework/PluginManager';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as DrawingOperation from '@dxos/plugin-illustrator/DrawingOperation';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { useSpaces } from '@dxos/react-client/echo';
import * as Layout from '@dxos/react-ui/Layout';

import {
  FIRST_SPACE_NAME,
  type NavigateMode,
  type Route,
  UNTITLED,
  dismissShell,
  getLastDrawing,
  isShellShown,
  parseRoute,
  showShell,
} from '../../../shared/index.ts';
import { DiagramAppCapabilities, DiagramAppEvents } from '../../types/index.ts';
import { createSpace, ensureIdentity, fileDrawing, preloadDrawing, recordRoute, startSpace } from '../../util/index.ts';
import { DiagramLayout, SPACE_MENU_ANCHOR } from '../DiagramLayout/index.ts';
import { SpaceView } from '../SpaceView/index.ts';

/** Records a boot milestone once, for the startup harness. */
const markOnce = (name: string) => {
  if (performance.getEntriesByName(name, 'mark').length === 0) {
    performance.mark(name);
  }
};

const SPACE_NOT_HERE = 'That space is not in this browser. Ask for an invitation link.';

/**
 * Brings up what the app needs before it reads or writes anything, all at once: the create operation (Idle), every
 * drawing variant (the illustrator's start), the app's types (its own start), the identity, and the article
 * surfaces, so the canvas does not suspend when it first renders.
 */
const prepare = async (manager: PluginManager.PluginManager, client: Client) => {
  markOnce('diagram-app:startup');
  await Promise.all([
    EffectEx.runPromise(manager.activate(ActivationEvents.SurfacesRequested(AppSurface.Article.role))),
    EffectEx.runPromise(manager.activate(ActivationEvents.Idle)),
    EffectEx.runPromise(manager.activate(IllustratorEvents.Start)),
    EffectEx.runPromise(manager.activate(DiagramAppEvents.Start)),
    EffectEx.runPromise(ensureIdentity(client)),
  ]);
  markOnce('diagram-app:prepared');
};

/**
 * The whole app (spec F-1). Mounts the app once the client is initialized, since client hooks suspend before then
 * and React holds a revealed boundary back for its fallback throttle; the preparation starts at once regardless.
 */
export const DiagramRoot = () => {
  markOnce('diagram-app:root-render');
  const manager = Hooks.useCapability(Capabilities.PluginManager);
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const [prepared, setPrepared] = useState<Promise<void>>();
  const [initialized, setInitialized] = useState(client.initialized);

  useEffect(() => {
    setPrepared(prepare(manager, client));
    if (!client.initialized) {
      void client.waitUntilInitialized().then(() => setInitialized(true));
    }
  }, [manager, client]);

  // Until a space shows, the boot shell covers the app.
  return initialized && prepared ? (
    <DiagramLayout>
      <DiagramApp prepared={prepared} />
    </DiagramLayout>
  ) : (
    <Layout.Container classNames='fixed inset-0 bg-base-surface' data-testid='diagram-app.loading' />
  );
};

/**
 * Opens the space and diagram the URL names and shows it with the pill. A link with parameters goes first to the
 * plugins' navigation handlers: SpacePlugin's opens Composer's join dialog for an invitation (spec F-6.1).
 */
const DiagramApp = ({ prepared }: { prepared: Promise<void> }) => {
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const navigationHandlers = Hooks.useCapabilities(AppCapabilities.NavigationHandler);
  const { invokePromise } = Hooks.useOperationInvoker();
  const registry = Hooks.useCapability(Capabilities.AtomRegistry);
  const layoutState = Hooks.useCapability(DiagramAppCapabilities.LayoutState);
  const [layout, updateLayout] = Hooks.useAtomCapabilityState(DiagramAppCapabilities.LayoutState);
  const spaces = useSpaces();
  // Set from asking for the join dialog until the joined space shows, or the dialog is dismissed: the space it started
  // on, the dismissals so far, and whether the dialog has opened.
  const [joining, setJoining] = useState<{ spaceId?: string; dismissals: number; opened: boolean }>();
  const startedRef = useRef(false);
  const { route } = layout;
  const space = spaces.find(({ id }) => id === route.spaceId);
  const spaceId = space?.id;

  const notify = useCallback(
    (id: string, title: string) =>
      void invokePromise(LayoutOperation.AddToast, { id: `diagram-app.${id}`, icon: 'ph--warning--regular', title }),
    [invokePromise],
  );

  /** The route is the URL's path (spec F-8): a pushed one is a step Back returns from. */
  const navigate = useCallback(
    (next: Route, mode: NavigateMode) => {
      recordRoute(next, mode);
      updateLayout((state) => ({ ...state, route: next }));
    },
    [updateLayout],
  );

  useEffect(() => {
    const handlePopState = () => updateLayout((state) => ({ ...state, route: parseRoute(window.location.pathname) }));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [updateLayout]);

  const openSpace = useCallback(
    (next: Space, mode: NavigateMode = 'push') =>
      navigate({ spaceId: next.id, drawingId: getLastDrawing(next.id) }, mode),
    [navigate],
  );

  const selectDrawing = useCallback(
    (drawingId: string, mode: NavigateMode) => {
      if (spaceId) {
        navigate({ spaceId, drawingId }, mode);
      }
    },
    [spaceId, navigate],
  );

  const createDiagram = useCallback(
    async (target: Space, name = UNTITLED): Promise<Drawing.Drawing> => {
      const { data, error } = await invokePromise(
        DrawingOperation.Create,
        { name, variant: Canvas.SCENE_SCHEMA },
        { spaceId: target.id },
      );
      if (error || !data) {
        throw error ?? new Error('Create returned no drawing');
      }
      const drawing = data.object as Drawing.Drawing;
      await EffectEx.runPromise(fileDrawing(target, drawing));
      return drawing;
    },
    [invokePromise],
  );

  /** The space and diagram the URL names, else the last space, else any, else a first run's "My diagrams" (spec F-2.1). */
  const openStart = useCallback(
    async (wanted: Route = {}) => {
      const existing = await EffectEx.runPromise(startSpace(client, wanted.spaceId));
      if (wanted.spaceId && existing?.id !== wanted.spaceId) {
        notify('space-not-here', SPACE_NOT_HERE);
      }
      if (!existing) {
        const created = await EffectEx.runPromise(createSpace(client, FIRST_SPACE_NAME));
        const drawing = await createDiagram(created);
        navigate({ spaceId: created.id, drawingId: drawing.id }, 'push');
        return;
      }
      const drawingId = (existing.id === wanted.spaceId ? wanted.drawingId : undefined) ?? getLastDrawing(existing.id);
      if (drawingId) {
        preloadDrawing(existing, drawingId);
      }
      navigate({ spaceId: existing.id, drawingId }, 'replace');
    },
    [client, notify, navigate, createDiagram],
  );

  // A space deleted here or on another device leaves the view: another space opens, or the first run on a profile with
  // none.
  const shownRef = useRef<string>(undefined);
  useEffect(() => {
    if (space) {
      shownRef.current = space.id;
    } else if (shownRef.current && shownRef.current === route.spaceId) {
      shownRef.current = undefined;
      const next = spaces[0];
      if (next) {
        openSpace(next, 'replace');
      } else {
        void openStart();
      }
    }
  }, [space, route.spaceId, spaces, openSpace, openStart]);

  useEffect(() => {
    // A capability identity change reruns this effect; a second startup would race the first to create the space.
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    const wanted = parseRoute(window.location.pathname);
    void (async () => {
      await prepared;
      if (window.location.search) {
        const url = new URL(window.location.href);
        await Promise.all(
          navigationHandlers.map((handler) =>
            EffectEx.runPromise(handler(url)).catch((err) => log.warn('navigation handler failed', { err })),
          ),
        );
      }
      // An invitation's handler has opened the join dialog by now.
      const { dialogOpen, dialogDismissals } = registry.get(layoutState);
      if (dialogOpen) {
        setJoining({ dismissals: dialogDismissals, opened: true });
        return;
      }
      dismissShell('join');
      await openStart(wanted);
      markOnce('diagram-app:space-open');
    })().catch((err) => {
      log.error('startup failed', { err });
      notify('startup-failed', 'The app could not start. Reload to try again.');
    });
  }, [prepared, navigationHandlers, registry, layoutState, openStart, notify]);

  // A join ends when its space shows. One the user closes first returns to the space it started on, or on a link
  // with none, to the usual start space.
  useEffect(() => {
    if (!joining) {
      return;
    }
    if (!joining.opened) {
      if (layout.dialogOpen) {
        setJoining({ ...joining, opened: true });
      }
      return;
    }
    if (space && space.id !== joining.spaceId) {
      setJoining(undefined);
    } else if (!layout.dialogOpen && layout.dialogDismissals > joining.dismissals) {
      setJoining(undefined);
      if (!route.spaceId) {
        void openStart();
      }
    }
  }, [joining, space, route.spaceId, layout.dialogOpen, layout.dialogDismissals, openStart]);

  // A join that succeeded closes its dialog before the joined space shows; the still copy stands in until it does, and
  // over the boot shell until the shell gives way to the joined diagram.
  const joined = !!joining?.opened && !layout.dialogOpen && layout.dialogDismissals === joining.dismissals;
  useLayoutEffect(() => {
    if (!joined) {
      return;
    }
    showShell('join');
    return () => {
      if (!isShellShown('layout')) {
        dismissShell('join');
      }
    };
  }, [joined]);

  const handleJoin = useCallback(() => {
    setJoining({ spaceId, dismissals: registry.get(layoutState).dialogDismissals, opened: false });
    void invokePromise(SpaceOperation.Join, {});
  }, [spaceId, registry, layoutState, invokePromise]);

  return space ? (
    <SpaceView
      key={space.id}
      space={space}
      spaces={spaces}
      drawingId={route.drawingId}
      onSelect={openSpace}
      onSelectDrawing={selectDrawing}
      onCreate={() => void invokePromise(SpaceOperation.OpenCreateSpace)}
      onJoin={handleJoin}
      onRename={(target) => void invokePromise(SpaceOperation.Rename, { space: target, caller: SPACE_MENU_ANCHOR })}
      onDelete={(target) => void invokePromise(SpaceOperation.OpenDeleteSpace, { space: target })}
      onCreateDiagram={createDiagram}
      onError={(message) => notify('error', message)}
    />
  ) : (
    <Layout.Container classNames='fixed inset-0 bg-base-surface' data-testid='diagram-app.loading' />
  );
};
