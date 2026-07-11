//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { type Connection } from '@dxos/plugin-connector/types';

import { Blogger, BloggerCapabilities, Publisher } from '#types';

import { UnpublishDraft } from './definitions';
import { linkedId, resolvePublisherService, tryPublisher } from './sync-support';

/** Deletes the draft's remote copy from `service` (if linked) and clears its foreign key. No-op otherwise. */
export const runUnpublishDraft = (
  service: Publisher.PublisherService,
  draft: Blogger.Draft,
  connection: Ref.Ref<Connection.Connection>,
): Effect.Effect<Blogger.Draft, Publisher.PublisherError> =>
  Effect.gen(function* () {
    const id = linkedId(draft, service.source);
    if (id) {
      yield* tryPublisher(() => service.deleteDraft(connection, id));
      Obj.update(draft, (draft) => {
        Obj.deleteKeys(draft, service.source);
      });
    }

    return draft;
  });

const handler: Operation.WithHandler<typeof UnpublishDraft> = UnpublishDraft.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ draft: draftRef, connection, publisherId }) {
      const services = yield* Capability.getAll(BloggerCapabilities.PublisherService);
      const service = yield* resolvePublisherService(services, publisherId);
      const draft = yield* Database.load(draftRef);
      const result = yield* runUnpublishDraft(service, draft, connection);
      return Ref.make(result);
    }),
  ),
);

export default handler;
