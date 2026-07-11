//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { type Connection } from '@dxos/plugin-connector/types';

import { Blogger, BloggerCapabilities, Publisher } from '#types';

import { ImportDrafts } from './definitions';
import { resolvePublisherService, tryPublisher } from './sync-support';

/** Remote ids already linked to one of the post's existing drafts, for `source`. */
const linkedRemoteIds = (post: Blogger.Post, source: string): Set<string> =>
  new Set(
    (post.drafts ?? [])
      .map((ref) => ref.target)
      .filter((draft): draft is Blogger.Draft => draft != null)
      .flatMap((draft) => Obj.getKeys(draft, source).map((key) => key.id)),
  );

/**
 * Pulls `service`'s remote drafts not yet linked to a local draft, creating one local Draft per new
 * remote draft (stamped with its foreign key) and appending it to `post.drafts`. Remote drafts already
 * linked to an existing local draft are skipped.
 */
export const runImportDrafts = (
  service: Publisher.PublisherService,
  post: Blogger.Post,
  connection: Ref.Ref<Connection.Connection>,
): Effect.Effect<Blogger.Post, Publisher.PublisherError> =>
  Effect.gen(function* () {
    const remoteDrafts = yield* tryPublisher(() => service.listDrafts(connection));
    const linkedIds = linkedRemoteIds(post, service.source);
    const unlinked = remoteDrafts.filter((remote) => !linkedIds.has(remote.id));

    for (const remote of unlinked) {
      const body = yield* tryPublisher(() => service.getDraft(connection, remote.id));
      const draft = Blogger.makeDraft({ label: remote.title, content: body.text });
      Obj.update(draft, (draft) => {
        Obj.getMeta(draft).keys.push({ source: service.source, id: remote.id });
      });

      // `post` is already attached to the database for every real invocation (a `Post` is only ever
      // created via `AddPost`), so pushing `Ref.make(draft)` onto `post.drafts` attaches `draft` too,
      // mirroring `add-draft.ts` (no separate `Database.add(draft)` call is needed).
      Obj.update(post, (post) => {
        post.drafts = [...(post.drafts ?? []), Ref.make(draft)];
      });
    }

    return post;
  });

const handler: Operation.WithHandler<typeof ImportDrafts> = ImportDrafts.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ post: postRef, connection, publisherId }) {
      const services = yield* Capability.getAll(BloggerCapabilities.PublisherService);
      const service = yield* resolvePublisherService(services, publisherId);
      const post = yield* Database.load(postRef);
      const result = yield* runImportDrafts(service, post, connection);
      return Ref.make(result);
    }),
  ),
);

export default handler;
