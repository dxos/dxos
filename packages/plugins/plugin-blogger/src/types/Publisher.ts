//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Ref } from '@dxos/echo';
import { type Connection } from '@dxos/plugin-connector/types';

// Provider-neutral draft DTO exchanged across the publisher capability boundary.
// NOT an ECHO object — a plain Effect schema.
export const PublisherDraft = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  title: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  scheduledAt: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});
export type PublisherDraft = Schema.Schema.Type<typeof PublisherDraft>;

export type PublisherDraftInput = {
  text: string;
  title?: string;
  scheduledAt?: string;
};

// A publishing backend (e.g. Typefully). Implemented by a provider plugin and
// contributed under BloggerCapabilities.PublisherService. The connection ref is
// the provider-neutral credential handle; token resolution stays in the provider.
export interface PublisherService {
  readonly id: string;
  readonly label: string;
  readonly source: string; // matches AccessToken.source, e.g. 'typefully.com'.
  listDrafts(connection: Ref.Ref<Connection.Connection>): Promise<PublisherDraft[]>;
  getDraft(connection: Ref.Ref<Connection.Connection>, id: string): Promise<PublisherDraft>;
  createDraft(connection: Ref.Ref<Connection.Connection>, input: PublisherDraftInput): Promise<PublisherDraft>;
  updateDraft(
    connection: Ref.Ref<Connection.Connection>,
    id: string,
    input: PublisherDraftInput,
  ): Promise<PublisherDraft>;
  deleteDraft(connection: Ref.Ref<Connection.Connection>, id: string): Promise<void>;
}

/** Thrown by a `PublisherService` when publish/import/unpublish fails against the remote backend. */
export class PublisherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublisherError';
  }
}

/** Thrown by a `PublisherService` when its credentials (e.g. a Connection's access token) are missing. */
export class MissingCredentialError extends PublisherError {
  constructor(message: string) {
    super(message);
    this.name = 'MissingCredentialError';
  }
}
