//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { type Obj } from '@dxos/echo';
import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Value of {@link ConnectorAuthAnnotation}: declares that objects of the annotated type offer
 * connector-auth ("Connect X") in their toolbar. Read by the connector plugin's single `connectorAuth`
 * app-graph-builder extension.
 */
export type ConnectorAuthAnnotationValue = {
  /**
   * Connectors offered for this type. A resolver computes them per-object at runtime — e.g. studio
   * resolves the id from the artifact's `kind` via the `GenerationService` capabilities. It runs
   * inside the graph's atom body, so a resolver must read capabilities through `get` (via
   * `capabilities.atom(...)`) — a synchronous `getAll` sees an empty list on a cold load, before the
   * providing plugin has activated, and is never re-run.
   */
  connectorIds:
    | readonly string[]
    | ((
        object: Obj.Unknown,
        capabilities: CapabilityManager.CapabilityManager,
        get: Atom.AtomContext,
      ) => readonly string[]);
  /**
   * Bind the object itself as the new connection's first sync target (e.g. an empty Mailbox). Also
   * selects the connected-state check: `true` ⇒ an external-sync `Cursor` targets the object; otherwise
   * ⇒ the space has a `Connection` for one of `connectorIds`.
   */
  bindTarget?: boolean;
};

/**
 * Schema annotation opting a type into connector-auth in its object toolbar. This is an Effect-schema
 * annotation (not serialized): it lives only on static plugin-provided types, so its value may hold
 * functions (see {@link ConnectorAuthAnnotationValue.connectorIds}). Set it on a type's inner
 * `Schema.Struct.pipe(...)`; the connector plugin's `connectorAuth` extension reads it off each
 * object's schema and contributes the connect action group.
 */
export const ConnectorAuthAnnotationId = '@dxos/plugin-connector/annotation/ConnectorAuth';
export const ConnectorAuthAnnotation = createAnnotationHelper<ConnectorAuthAnnotationValue>(ConnectorAuthAnnotationId);
