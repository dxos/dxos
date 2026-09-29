//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';
import { type EventAttributes, type RemoteEvents, TRACE_PROCESSOR } from '@dxos/tracing';

import type * as Observability from '../Observability.ts';
import type * as ObservabilityExtension from '../ObservabilityExtension.ts';

/** The product events the client's trace events are reported as, by invitation kind. */
export const EVENTS = {
  spaceCreate: 'space.create',
  spaceShare: 'space.share',
  spaceJoin: 'space.join',
  spaceAdmit: 'space.admit',
  deviceInvite: 'identity.device.invite',
  deviceJoin: 'identity.join',
  deviceAdmit: 'identity.device.admit',
} as const;

type ProductEvent = { name: string; properties: Record<string, unknown> };

/** Maps one of the client's trace events to the product event it stands for, if any. */
export const toProductEvent = (name: string, attributes: EventAttributes): ProductEvent | undefined => {
  const { spaceId, kind, authMethod, multiUse, origin } = attributes;
  const device = kind === 'device';
  switch (name) {
    case 'client.space.create':
      return { name: EVENTS.spaceCreate, properties: { spaceId, origin } };
    case 'client.invitation.create':
      return device
        ? { name: EVENTS.deviceInvite, properties: { authMethod, multiUse } }
        : { name: EVENTS.spaceShare, properties: { spaceId, authMethod, multiUse } };
    case 'client.invitation.accept':
      return device ? { name: EVENTS.deviceJoin, properties: {} } : { name: EVENTS.spaceJoin, properties: { spaceId } };
    case 'client.invitation.admit':
      return device
        ? { name: EVENTS.deviceAdmit, properties: { multiUse } }
        : { name: EVENTS.spaceAdmit, properties: { spaceId, multiUse } };
    default:
      return undefined;
  }
};

/** Reports the client's space and invitation trace events as product events until the returned cleanup runs. */
export const listen = (events: RemoteEvents, capture: ObservabilityExtension.Events['captureEvent']): (() => void) => {
  const processor = {
    emit: (name: string, attributes: EventAttributes) => {
      const event = toProductEvent(name, attributes);
      if (event === undefined) {
        return;
      }
      try {
        capture(event.name, event.properties);
      } catch (error) {
        log.catch(error);
      }
    },
  };
  events.registerProcessor(processor);
  return () => events.unregisterProcessor(processor);
};

/**
 * Reports spaces this realm creates and invitations it shares, accepts and admits guests through, however they
 * were started: from a dialog, an operation, an agent or a deep link.
 */
export const provider: Observability.DataProvider = (observability) =>
  Effect.sync(() =>
    listen(TRACE_PROCESSOR.remoteEvents, (event, attributes) => observability.events.captureEvent(event, attributes)),
  );
