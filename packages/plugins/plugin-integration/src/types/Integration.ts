//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { Format, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { AccessToken } from '@dxos/types';

/**
 * One target of an Integration: a local object populated from the external service,
 * along with its opaque per-target sync state and observed status.
 */
const IntegrationTarget = Schema.Struct({
  object: Ref.Ref(Obj.Unknown),
  /** Opaque, service-defined cursor for this target (e.g. a last-modified timestamp). */
  cursor: Schema.String.pipe(Schema.optional),
  /** Observed status: ISO timestamp of the most recent successful sync. */
  lastSyncAt: Format.DateTime.pipe(Schema.optional),
  /** Observed status: error message from the most recent failed sync, if any. */
  lastError: Schema.String.pipe(Schema.optional),
}).pipe(FormInputAnnotation.set(false));

export type IntegrationTarget = Schema.Schema.Type<typeof IntegrationTarget>;

/**
 * Generic representation of an external-service integration.
 *
 * Pairs an {@link AccessToken} with a list of root local objects that are populated
 * (and bidirectionally synced) from the external service.
 *
 * The schema is service-agnostic. The active service is identified by the
 * referenced AccessToken's `source` (e.g. `'trello.com'`). Service plugins
 * contribute an `IntegrationProvider` capability for each source they support.
 *
 * Scheduling/recurrence is deliberately not modeled here — DXOS Triggers own
 * recurring execution and can reference the service-specific sync operation
 * directly.
 */
export const Integration = Schema.Struct({
  /** User-friendly label distinct from account/source — e.g. "Work Trello". */
  name: Schema.String.pipe(Schema.optional),
  accessToken: Ref.Ref(AccessToken.AccessToken),
  /** Root local objects this Integration populates. */
  targets: Schema.Array(IntegrationTarget),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.integration',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--plugs-connected--regular',
    hue: 'cyan',
  }),
);

export interface Integration extends Schema.Schema.Type<typeof Integration> {}

export const instanceOf = (value: unknown): value is Integration => Obj.instanceOf(Integration, value);

export const make = (props: Obj.MakeProps<typeof Integration>) => Obj.make(Integration, props);
