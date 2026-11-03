//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type RpcStub, RpcTarget } from 'capnweb';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';

import { Database, type Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';

import { Client, CloudflareOsError, type Protocol } from '#api';
import { CloudflareOs } from '#types';

/** Where a connection's account lives and the session token it signs in with. */
export type Account = { url: string; token: string };

/** The account a connection stores: its token's source is the deployment's hostname. */
export const fromConnection: (
  connection: Connection.Connection,
) => Effect.Effect<Account, CloudflareOsError, Database.Service> = Effect.fnUntraced(function* (connection) {
  const accessToken = yield* Database.load(Connection.getAccessToken(connection)).pipe(
    Effect.mapError((cause) => new CloudflareOsError({ message: 'The connection has no credential.', cause })),
  );
  return { url: Client.urlFromHost(accessToken.source), token: accessToken.token };
});

/** The account a connection ref points at. */
export const fromConnectionRef = (
  ref: Ref.Ref<Connection.Connection>,
): Effect.Effect<Account, CloudflareOsError, Database.Service> =>
  Database.load(ref).pipe(
    Effect.mapError((cause) => new CloudflareOsError({ message: 'The connection could not be loaded.', cause })),
    Effect.flatMap(fromConnection),
  );

/** An authenticated session for the account, closed with the scope. */
export const open = (
  account: Account,
): Effect.Effect<RpcStub<Protocol.AuthenticatedApi>, CloudflareOsError, Scope.Scope> => Client.authenticate(account);

/** The bound workspace's account and an open session to it, closed with the scope. */
export const openWorkspace: (
  workspace: CloudflareOs.Workspace,
) => Effect.Effect<RpcStub<Protocol.Overseer>, CloudflareOsError, Database.Service | Scope.Scope> = Effect.fnUntraced(
  function* (workspace) {
    const account = yield* fromConnectionRef(workspace.connection);
    const user = yield* open(account);
    const overseer = user.openWorkspace(workspace.workspaceId);
    yield* Effect.addFinalizer(() => Effect.sync(() => Client.dispose(overseer)));
    return overseer;
  },
);

/** The gadget a workpiece summary describes, or undefined for a worktree. */
export const toGadget = (summary: Protocol.WorkpieceSummary): CloudflareOs.Gadget | undefined =>
  summary.type === 'gadget' && 'title' in summary && summary.title !== undefined
    ? {
        id: summary.id,
        title: summary.title,
        ...('chatId' in summary && summary.chatId !== undefined && { chatId: summary.chatId }),
      }
    : undefined;

/**
 * The callback object a workpiece subscription calls. Only the subscriber's methods are public: capnweb
 * types everything public on a target it is handed, and the state lives in the handler instead.
 */
class WorkpiecesTarget extends RpcTarget implements Protocol.WorkpiecesSubscriber {
  readonly #handler: Protocol.WorkpiecesSubscriber;

  constructor(handler: Protocol.WorkpiecesSubscriber) {
    super();
    this.#handler = handler;
  }

  entry(summary: Protocol.WorkpieceSummary): void {
    this.#handler.entry(summary);
  }

  removed(id: Protocol.WorkpieceId): void {
    this.#handler.removed(id);
  }

  ready(): void {
    this.#handler.ready();
  }
}

/** A workpiece subscriber that keeps the workspace's gadgets, reporting each change and the end of the listing. */
export const gadgetSubscriber = (
  onChange: (gadgets: CloudflareOs.Gadget[]) => void,
  onReady?: (gadgets: CloudflareOs.Gadget[]) => void,
): WorkpiecesTarget => {
  const gadgets = new Map<number, CloudflareOs.Gadget>();
  return new WorkpiecesTarget({
    entry: (summary) => {
      const gadget = toGadget(summary);
      if (gadget) {
        gadgets.set(gadget.id, gadget);
        onChange([...gadgets.values()]);
      }
    },
    removed: (id) => {
      if (gadgets.delete(id)) {
        onChange([...gadgets.values()]);
      }
    },
    ready: () => onReady?.([...gadgets.values()]),
  });
};

/** How long a gadget listing may take; a dropped socket never sends `ready`. */
const LIST_TIMEOUT_MS = 30_000;

/** The gadgets an overseer lists, read through a subscription closed once the listing is complete. */
export const listGadgets = (
  overseer: RpcStub<Protocol.Overseer>,
): Effect.Effect<CloudflareOs.Gadget[], CloudflareOsError> =>
  Client.call(
    'Could not list the workspace gadgets.',
    () =>
      new Promise<CloudflareOs.Gadget[]>((resolve, reject) => {
        const subscription = overseer.subscribeToWorkpieces(
          gadgetSubscriber(
            () => {},
            (gadgets) => {
              resolve(gadgets);
              void subscription.then(Client.dispose, () => {});
            },
          ),
        );
        subscription.catch(reject);
      }),
  ).pipe(
    Effect.timeoutOrElse({
      duration: LIST_TIMEOUT_MS,
      orElse: () => Effect.fail(new CloudflareOsError({ message: 'Listing the workspace gadgets timed out.' })),
    }),
  );
