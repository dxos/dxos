//
// Copyright 2026 DXOS.org
//

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
   * resolves the id from the artifact's `kind` via the `GenerationService` capabilities.
   */
  connectorIds:
    | readonly string[]
    | ((object: Obj.Unknown, capabilities: CapabilityManager.CapabilityManager) => readonly string[]);
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
