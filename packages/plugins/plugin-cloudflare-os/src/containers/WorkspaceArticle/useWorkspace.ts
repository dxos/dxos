//
// Copyright 2026 DXOS.org
//

import { type RpcStub, newMessagePortRpcSession } from 'capnweb';
import { useCallback, useEffect, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';

import { Client, type Protocol } from '#api';
import { type CloudflareOs } from '#types';

import * as Account from '../../Account.ts';

/** How long to wait before reopening a dropped session. */
const RECONNECT_DELAY_MS = 2_000;

/** How long the listing may take to reach `ready`; an open socket that stalls never reports a break. */
const SNAPSHOT_TIMEOUT_MS = 30_000;

export type WorkspaceSession = {
  gadgets: CloudflareOs.Gadget[];
  /** The selected gadget, or the first one when none is selected. */
  gadgetId?: number;
  error?: string;
  /** The selected gadget's UI code, once loaded; null when the gadget has no UI yet. */
  jsCode?: string | null;
  /** Bridges a gadget frame's port to the selected gadget's server. */
  connect: (port: MessagePort) => void;
};

/**
 * A live session to the bound workspace: its gadgets as the deployment reports them, and the selected
 * gadget's UI code and server connection. Closed when the article unmounts or the account changes.
 */
export const useWorkspace = (workspace: CloudflareOs.Workspace, selected: number | undefined): WorkspaceSession => {
  const [connection] = useObject(workspace.connection);
  const [accessToken] = useObject(connection?.accessToken);
  const [overseer, setOverseer] = useState<{ stub: RpcStub<Protocol.Overseer> }>();
  const [gadgets, setGadgets] = useState<CloudflareOs.Gadget[]>(() => [...(workspace.gadgets ?? [])]);
  const [error, setError] = useState<string>();
  const [gadgetError, setGadgetError] = useState<string>();
  const [jsCode, setJsCode] = useState<string | null>();
  // Bumped when the session drops, which reopens it.
  const [generation, setGeneration] = useState(0);
  const gadgetId = selected ?? gadgets[0]?.id;
  // A gadget that only exists in a chat's proposed changes is shown as that chat proposes it.
  const chatId = gadgets.find(({ id }) => id === gadgetId)?.chatId;

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let closed = false;
    const url = Client.urlFromHost(accessToken.source);
    const api = Client.newSession(url);
    const stub = api.authenticate(accessToken.token).openWorkspace(workspace.workspaceId);
    // Wrapped: a stub is callable, so React would treat it as a state updater.
    setOverseer({ stub });
    setError(undefined);
    // The listing replays every gadget before `ready`; publishing only the complete snapshot keeps the
    // selected gadget from flickering out and drops gadgets removed while the session was down.
    let ready = false;
    const subscription = stub.subscribeToWorkpieces(
      Account.gadgetSubscriber(
        (next) => {
          if (ready) {
            setGadgets(next);
          }
        },
        (snapshot) => {
          ready = true;
          clearTimeout(deadline);
          setGadgets(snapshot);
        },
      ),
    );
    const deadline = setTimeout(() => {
      if (!closed && !ready) {
        log.warn('workspace listing stalled; reopening the session');
        setGeneration((value) => value + 1);
      }
    }, SNAPSHOT_TIMEOUT_MS);
    // A dropped WebSocket ends the subscription silently, so reopen the session after a pause.
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    api.onRpcBroken(() => {
      if (!closed) {
        reconnect = setTimeout(() => setGeneration((value) => value + 1), RECONNECT_DELAY_MS);
      }
    });
    subscription.catch((err: unknown) => {
      // Closing the session below rejects its calls; only a session still in use has failed.
      if (!closed) {
        log.catch(err);
        setError('Could not open the workspace. Check the Cloudflare OS connection.');
      }
    });
    return () => {
      closed = true;
      clearTimeout(deadline);
      clearTimeout(reconnect);
      void subscription.then(Client.dispose, () => {});
      Client.dispose(stub);
      Client.dispose(api);
    };
  }, [accessToken?.source, accessToken?.token, workspace.workspaceId, generation]);

  useEffect(() => {
    setJsCode(undefined);
    setGadgetError(undefined);
    if (!overseer || gadgetId === undefined) {
      return;
    }
    let cancelled = false;
    const gadget = overseer.stub.getGadget(gadgetId);
    gadget.getUiBundle(chatId).then(
      (bundle) => {
        if (!cancelled) {
          setJsCode(bundle?.jsCode ?? null);
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          log.catch(err);
          setGadgetError('Could not load the gadget.');
        }
      },
    );
    return () => {
      cancelled = true;
      Client.dispose(gadget);
    };
  }, [overseer, gadgetId, chatId]);

  const connect = useCallback(
    (port: MessagePort) => {
      if (!overseer || gadgetId === undefined) {
        return;
      }
      // The frame talks to the gadget's server through this bridge; nothing else leaves the frame.
      const server = overseer.stub.getGadget(gadgetId).connectToGadget(chatId);
      newMessagePortRpcSession(port, server);
    },
    [overseer, gadgetId, chatId],
  );

  return { gadgets, gadgetId, error: error ?? gadgetError, jsCode, connect };
};
