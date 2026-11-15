//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import { type Space } from '@dxos/client/echo';
import { type AuthenticatingInvitationObservable, type Invitation } from '@dxos/client/invitations';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as DrawingOperation from '@dxos/plugin-illustrator/DrawingOperation';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import { toPublicKey } from '@dxos/protocols/buf';
import { useSpaces } from '@dxos/react-client/echo';
import * as Layout from '@dxos/react-ui/Layout';
import * as Toast from '@dxos/react-ui/Toast';
import * as Typography from '@dxos/react-ui/Typography';

import * as DiagramAppEvents from '../DiagramAppEvents.ts';
import {
  FIRST_SPACE_NAME,
  type Route,
  UNTITLED,
  createSpace,
  ensureIdentity,
  fileDrawing,
  getLastDrawing,
  joinSpace,
  parseInvitationCode,
  parseRoute,
  routePath,
  setLastDrawing,
  setLastSpace,
  startSpace,
  takeInvitationCode,
} from '../model/index.ts';
import { JoinStatus } from './JoinStatus.tsx';
import { NameDialog } from './NameDialog.tsx';
import { type NavigateMode, SpaceView } from './SpaceView.tsx';

const LINK_FAILED = 'This link no longer works. Ask for a new one.';
const SPACE_NOT_HERE = 'That space is not in this browser. Ask for an invitation link.';

/**
 * The whole app (spec F-1): creates the identity, opens the space and diagram the URL names (or joins one from an
 * invitation link), and shows the diagram with the space switcher, diagram menu, viewers and Share over it.
 */
export const DiagramRoot = () => {
  const manager = Hooks.useCapability(Capabilities.PluginManager);
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const { invokePromise } = Hooks.useOperationInvoker();
  const spaces = useSpaces();
  const [route, setRoute] = useState<Route>({});
  const [joining, setJoining] = useState<AuthenticatingInvitationObservable>();
  const [dialog, setDialog] = useState<'new-space' | 'join'>();
  const [notice, setNotice] = useState<string>();
  const startedRef = useRef(false);
  const space = spaces.find(({ id }) => id === route.spaceId);
  const spaceId = space?.id;

  /** The route is the URL's path (spec F-8): a pushed one is a step Back returns from. */
  const navigate = useCallback((next: Route, mode: NavigateMode) => {
    if (next.spaceId) {
      setLastSpace(next.spaceId);
      if (next.drawingId) {
        setLastDrawing(next.spaceId, next.drawingId);
      }
    }
    setRoute(next);
    const path = routePath(next);
    if (path !== window.location.pathname) {
      window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', path + window.location.search);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const createSpaceWithDiagram = useCallback(
    async (name: string) => {
      const created = await EffectEx.runPromise(createSpace(client, name));
      const drawing = await createDiagram(created);
      navigate({ spaceId: created.id, drawingId: drawing.id }, 'push');
    },
    [client, createDiagram, navigate],
  );

  /** The space and diagram the URL names, else the last space, else any, else a first run's "My diagrams" (spec F-2.1). */
  const openStart = useCallback(
    async (wanted: Route = {}) => {
      const existing = await EffectEx.runPromise(startSpace(client, wanted.spaceId));
      if (wanted.spaceId && existing?.id !== wanted.spaceId) {
        setNotice(SPACE_NOT_HERE);
      }
      if (!existing) {
        await createSpaceWithDiagram(FIRST_SPACE_NAME);
      } else if (existing.id === wanted.spaceId) {
        navigate({ spaceId: existing.id, drawingId: wanted.drawingId ?? getLastDrawing(existing.id) }, 'replace');
      } else {
        openSpace(existing, 'replace');
      }
    },
    [client, navigate, openSpace, createSpaceWithDiagram],
  );

  const startJoin = useCallback(
    (code: string) => {
      try {
        setJoining(joinSpace(client, code));
      } catch (err) {
        log.warn('invitation code did not decode', { err });
        setNotice(LINK_FAILED);
        if (!spaceId) {
          void openStart();
        }
      }
    },
    [client, spaceId, openStart],
  );

  const handleJoined = useCallback(
    async (invitation: Invitation) => {
      const spaceKey = toPublicKey(invitation.spaceKey);
      const joined = client.spaces
        .get()
        .find((candidate) => candidate.id === invitation.spaceId || (spaceKey && candidate.key.equals(spaceKey)));
      if (!joined) {
        throw new Error('Joined space not found');
      }
      await joined.waitUntilReady();
      openSpace(joined, 'replace');
      setJoining(undefined);
    },
    [client, openSpace],
  );

  const handleJoinFailed = useCallback(() => {
    setJoining(undefined);
    setNotice(LINK_FAILED);
    if (!spaceId) {
      void openStart();
    }
  }, [spaceId, openStart]);

  useEffect(() => {
    // A capability identity change reruns this effect; a second startup would race the first to create the space.
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    const code = takeInvitationCode();
    const wanted = parseRoute(window.location.pathname);
    void (async () => {
      // The create operation (Idle), every drawing variant (the illustrator's start) and the app's types (its own
      // start) must be up before anything is written or rendered.
      await EffectEx.runPromise(manager.activate(ActivationEvents.Idle));
      await EffectEx.runPromise(manager.activate(IllustratorEvents.Start));
      await EffectEx.runPromise(manager.activate(DiagramAppEvents.Start));
      await EffectEx.runPromise(ensureIdentity(client));
      if (code) {
        startJoin(code);
      } else {
        await openStart(wanted);
      }
    })().catch((err) => {
      log.error('startup failed', { err });
      setNotice('The app could not start. Reload to try again.');
    });
  }, [manager, client, startJoin, openStart]);

  return (
    <Toast.Provider>
      {space ? (
        <SpaceView
          key={space.id}
          space={space}
          spaces={spaces}
          drawingId={route.drawingId}
          onSelect={openSpace}
          onSelectDrawing={selectDrawing}
          onCreate={() => setDialog('new-space')}
          onJoin={() => setDialog('join')}
          onCreateDiagram={createDiagram}
          onError={setNotice}
        />
      ) : (
        !joining && (
          <Layout.Flex center classNames='fixed inset-0 bg-base-surface' data-testid='diagram-app.loading'>
            <Typography.Text classNames='text-fg-muted'>Opening…</Typography.Text>
          </Layout.Flex>
        )
      )}

      {joining && <JoinStatus invitation={joining} onJoined={handleJoined} onFailed={handleJoinFailed} />}

      {dialog === 'new-space' && (
        <NameDialog
          title='New space'
          label='Space name'
          submitLabel='Create'
          placeholder='Team space'
          onClose={() => setDialog(undefined)}
          onSubmit={(name) => {
            setDialog(undefined);
            createSpaceWithDiagram(name).catch((err) => {
              log.error('space not created', { err });
              setNotice('The space could not be created.');
            });
          }}
        />
      )}
      {dialog === 'join' && (
        <NameDialog
          title='Join a space'
          label='Invitation link'
          submitLabel='Join'
          placeholder='Paste a link from this app or Composer'
          onClose={() => setDialog(undefined)}
          onSubmit={(text) => {
            setDialog(undefined);
            const code = parseInvitationCode(text);
            if (code) {
              startJoin(code);
            }
          }}
        />
      )}

      <Toast.Root
        open={!!notice}
        onOpenChange={(open) => !open && setNotice(undefined)}
        data-testid='diagram-app.notice'
      >
        <Toast.Header icon='ph--warning--regular'>{notice}</Toast.Header>
      </Toast.Root>
      <Toast.Toaster />
    </Toast.Provider>
  );
};
