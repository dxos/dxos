//
// Copyright 2026 DXOS.org
//

import * as Either from 'effect/Either';
import * as Schema from 'effect/Schema';

import { type Capabilities, type CapabilityManager } from '@dxos/app-framework';
import { getActiveSpace } from '@dxos/app-toolkit';
import { type Database } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CrxCapabilities, PageAction } from '#types';

/**
 * Dependencies for the invoke handler, injected so the handler can be
 * unit-tested without a capability manager (the capability module wires the
 * real implementations).
 */
export type InvokeDeps = {
  getActions: () => PageAction.PageAction[];
  getTarget: () => Database.Database | undefined;
  invoke: (
    operation: PageAction.PageAction['operation'],
    input: unknown,
  ) => Promise<{ data?: { id?: string }; error?: unknown }>;
};

/**
 * Answer a registry-list request with the currently contributed actions as
 * serializable descriptors.
 */
export const handleListEvent = (detail: unknown, getActions: () => PageAction.PageAction[]): PageAction.ListAck => {
  const decoded = Schema.decodeUnknownEither(PageAction.ListRequest)(detail);
  if (Either.isLeft(decoded)) {
    log.info('rejected invalid page-actions list request');
    // Best-effort id echo so the extension can correlate the failure ack.
    const envelope = Schema.decodeUnknownEither(PageAction.Envelope)(detail);
    const id = Either.isRight(envelope) ? (envelope.right.id ?? '') : '';
    return { version: 1, id, ok: false, error: 'invalidPayload' };
  }
  return {
    version: 1,
    id: decoded.right.id,
    ok: true,
    actions: getActions().map(PageAction.toDescriptor),
  };
};

/**
 * Handle a single invoke request. Two-pass decode (loose envelope, then
 * strict payload) so newer versions yield `unsupportedVersion` rather than
 * the generic `invalidPayload`.
 */
export const handleInvokeEvent = async (detail: unknown, deps: InvokeDeps): Promise<PageAction.InvokeAck> => {
  const envelope = Schema.decodeUnknownEither(PageAction.Envelope)(detail);
  if (Either.isLeft(envelope)) {
    log.info('rejected invalid page-action envelope');
    return { version: 1, id: '', ok: false, error: 'invalidPayload' };
  }
  // Best-effort id echo so the extension can correlate failure acks.
  const envelopeId = envelope.right.id ?? '';
  if (envelope.right.version !== 1) {
    log.info('rejected unsupported page-action version', { version: envelope.right.version });
    return { version: 1, id: envelopeId, ok: false, error: 'unsupportedVersion' };
  }

  const decoded = Schema.decodeUnknownEither(PageAction.InvokeRequest)(detail);
  if (Either.isLeft(decoded)) {
    log.info('rejected invalid page-action payload');
    return { version: 1, id: envelopeId, ok: false, error: 'invalidPayload' };
  }
  const request = decoded.right;

  const action = deps.getActions().find((candidate) => candidate.id === request.actionId);
  if (!action) {
    log.info('rejected unknown page action', { actionId: request.actionId });
    return { version: 1, id: request.id, ok: false, error: 'unknownAction' };
  }

  const target = deps.getTarget();
  if (!target) {
    return { version: 1, id: request.id, ok: false, error: 'noSpace' };
  }

  try {
    const { data, error } = await deps.invoke(action.operation, { snapshot: request.inputs, target });
    if (error || !data) {
      log.info('page-action operation failed', { actionId: action.id, error });
      return { version: 1, id: request.id, ok: false, error: 'operationFailed' };
    }
    log.info('page action invoked', { actionId: action.id, objectId: data.id });
    return { version: 1, id: request.id, ok: true, objectId: data.id };
  } catch (err) {
    log.catch(err);
    return { version: 1, id: request.id, ok: false, error: 'operationFailed' };
  }
};

/**
 * Attach the page-actions window event listeners. Returns a disposer.
 * Actions are resolved per-event via `getAll` so late-activating plugins are
 * always included.
 */
export const installPageActionListeners = (
  capabilities: CapabilityManager.CapabilityManager,
  invoker: Capabilities.OperationInvoker,
  onResult?: (ack: PageAction.InvokeAck, label?: string) => void,
): (() => void) => {
  const getActions = () => capabilities.getAll(CrxCapabilities.PageAction).flat();

  const onList = (event: Event) => {
    const ack = handleListEvent((event as CustomEvent).detail, getActions);
    window.dispatchEvent(new CustomEvent(PageAction.LIST_ACK_EVENT, { detail: ack }));
  };

  const onInvoke = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    const deps: InvokeDeps = {
      getActions,
      getTarget: () => {
        const client = capabilities.get(ClientCapabilities.Client);
        return getActiveSpace(client, capabilities)?.db;
      },
      invoke: (operation, input) => invoker.invokePromise(operation, input),
    };
    void handleInvokeEvent(detail, deps)
      .catch((err): PageAction.InvokeAck => {
        log.catch(err);
        return { version: 1, id: '', ok: false, error: 'operationFailed' };
      })
      .then((ack) => {
        window.dispatchEvent(new CustomEvent(PageAction.INVOKE_ACK_EVENT, { detail: ack }));
        try {
          const actionId = (detail as { actionId?: string } | null)?.actionId;
          onResult?.(ack, getActions().find((candidate) => candidate.id === actionId)?.label);
        } catch (err) {
          log.catch(err);
        }
      });
  };

  window.addEventListener(PageAction.LIST_EVENT, onList as EventListener);
  window.addEventListener(PageAction.INVOKE_EVENT, onInvoke as EventListener);

  // Announce that the page-side listeners are ready so the extension relay
  // can trigger a registry refresh even when Composer boots after the
  // content script has already installed.
  window.dispatchEvent(new CustomEvent(PageAction.READY_EVENT));

  return () => {
    window.removeEventListener(PageAction.LIST_EVENT, onList as EventListener);
    window.removeEventListener(PageAction.INVOKE_EVENT, onInvoke as EventListener);
  };
};
