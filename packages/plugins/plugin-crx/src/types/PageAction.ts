//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Operation } from '@dxos/compute';
import { PageAction as Protocol } from '@dxos/crx-protocol';

// Re-export the serializable wire schemas from the shared protocol package.
export const {
  Rect,
  Source,
  Selection,
  Hints,
  Snapshot,
  Predicate,
  ExtractorRef,
  Context,
  Descriptor,
  PageInfo,
  Envelope,
  ListRequest,
  ListAck,
  InvokeRequest,
  InvokeAck,
  READY_EVENT,
  LIST_EVENT,
  LIST_ACK_EVENT,
  INVOKE_EVENT,
  INVOKE_ACK_EVENT,
} = Protocol;

export type Source = Protocol.Source;
export type Selection = Protocol.Selection;
export type Hints = Protocol.Hints;
export type Snapshot = Protocol.Snapshot;
export type Predicate = Protocol.Predicate;
export type ExtractorRef = Protocol.ExtractorRef;
export type Context = Protocol.Context;
export type Descriptor = Protocol.Descriptor;
export type PageInfo = Protocol.PageInfo;
export type Envelope = Protocol.Envelope;
export type ListRequest = Protocol.ListRequest;
export type ListAck = Protocol.ListAck;
export type InvokeRequest = Protocol.InvokeRequest;
export type InvokeAck = Protocol.InvokeAck;

/** A live page-action contribution: the target operation accepts `{ snapshot, target }` and returns `{ id }`. */
export type PageAction = Omit<Descriptor, 'operation'> & {
  operation: Operation.Definition.Any;
};

export const toDescriptor = (action: PageAction): Descriptor => ({
  ...action,
  operation: action.operation.meta.key.toString(),
});
