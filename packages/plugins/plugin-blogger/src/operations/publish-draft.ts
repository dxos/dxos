//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { type Connection } from '@dxos/plugin-connector/types';

import { Blogger, BloggerCapabilities, Publisher } from '#types';

import { PublishDraft } from './definitions';
import { draftText, linkedId, resolvePublisherService, tryPublisher } from './sync-support';

/**
 * Pushes a draft's current body to `service`: creates the remote draft on first publish, otherwise
 * updates the one it is already linked to. Stamps (or refreshes) the draft's foreign key with the
 * result id, keyed by `service.source`.
 */
export const runPublishDraft = (
  service: Publisher.PublisherService,
  draft: Blogger.Draft,
  connection: Ref.Ref<Connection.Connection>,
): Effect.Effect<Blogger.Draft, Publisher.PublisherError> =>
  Effect.gen(function* () {
    const id = linkedId(draft, service.source);
    const text = draftText(draft);
    const result = yield* tryPublisher(() =>
      id ? service.updateDraft(connection, id, { text }) : service.createDraft(connection, { text }),
    );

    Obj.update(draft, (draft) => {
      Obj.deleteKeys(draft, service.source);
      Obj.getMeta(draft).keys.push({ source: service.source, id: result.id });
    });

    return draft;
  });

const handler: Operation.WithHandler<typeof PublishDraft> = PublishDraft.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ draft: draftRef, connection, publisherId }) {
      const services = yield* Capability.getAll(BloggerCapabilities.PublisherService);
      const service = yield* resolvePublisherService(services, publisherId);
      const draft = yield* Database.load(draftRef);
      const result = yield* runPublishDraft(service, draft, connection);
      return Ref.make(result);
    }),
  ),
);

export default handler;
