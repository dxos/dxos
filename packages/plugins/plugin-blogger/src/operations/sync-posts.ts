//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { type Connection } from '@dxos/plugin-connector/types';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { Blog, BloggerCapabilities, Publisher } from '#types';

import { SyncPosts } from './definitions';
import { linkedId, postText, resolvePublisherService, tryPublisher } from './sync-support';

/** Reports sync progress; `total` is an upper bound (posts to reconcile + remote drafts). */
export type SyncProgress = (current: number, total: number) => void;

/**
 * Bidirectionally reconciles a publication's posts with `service`'s remote drafts, keyed by the remote
 * id stored as a foreign key on each post's meta (source = `service.source`). Local body content wins
 * for posts already linked to a still-present remote draft. See {@link SyncPosts} for the full policy.
 * `onProgress` (optional) is called as each post/draft is processed to drive a progress monitor.
 */
export const runSyncPosts = (
  service: Publisher.PublisherService,
  publication: Blog.Publication,
  connection: Ref.Ref<Connection.Connection>,
  onProgress?: SyncProgress,
): Effect.Effect<Blog.Publication, Publisher.PublisherError> =>
  Effect.gen(function* () {
    const source = service.source;
    const posts = (publication.posts ?? []).map((ref) => ref.target).filter(isNonNullable);
    const remoteDrafts = yield* tryPublisher(() => service.listDrafts(connection));
    const remoteIds = new Set(remoteDrafts.map((remote) => remote.id));
    const linkedRemoteIds = new Set<string>();

    // Stable upper bound: every local post is reconciled and (at most) every remote draft is pulled.
    const total = posts.length + remoteDrafts.length;
    let done = 0;
    onProgress?.(done, total);

    // Push/reconcile each local post.
    for (const post of posts) {
      const id = linkedId(post, source);
      if (id) {
        linkedRemoteIds.add(id);
        if (remoteIds.has(id)) {
          // Linked and still remote: push the local body (local is the source of truth).
          yield* tryPublisher(() => service.updateDraft(connection, id, { text: postText(post) }));
        } else {
          // Linked but the remote copy is gone: revert to a local-only draft.
          Obj.update(post, (post) => {
            Obj.deleteKeys(post, source);
            post.status = 'draft';
          });
        }
      } else {
        // Never synced: create the remote draft and stamp the returned id on the post.
        const result = yield* tryPublisher(() => service.createDraft(connection, { text: postText(post) }));
        Obj.update(post, (post) => {
          Obj.deleteKeys(post, source);
          Obj.getMeta(post).keys.push({ source, id: result.id });
          post.status = 'published';
        });
        linkedRemoteIds.add(result.id);
      }
      onProgress?.(++done, total);
    }

    // Pull remote drafts not linked to any local post, creating one published Post each.
    const unlinked = remoteDrafts.filter((remote) => !linkedRemoteIds.has(remote.id));
    for (const remote of unlinked) {
      // `listDrafts` already returns full body text for most providers; only fall back to the
      // (potentially unsupported, e.g. Typefully v1) `getDraft` call when it did not.
      const text = remote.text || (yield* tryPublisher(() => service.getDraft(connection, remote.id))).text;
      const post = Blog.makePost({ name: remote.title, content: text });
      Obj.update(post, (post) => {
        Obj.getMeta(post).keys.push({ source, id: remote.id });
        post.status = 'published';
      });
      // `publication` is already attached (only ever created via AddPublication), so pushing
      // `Ref.make(post)` onto `posts` attaches `post` too — no separate `Database.add` needed.
      Obj.update(publication, (publication) => {
        publication.posts = [...(publication.posts ?? []), Ref.make(post)];
      });
      onProgress?.(++done, total);
    }

    return publication;
  });

const handler: Operation.WithHandler<typeof SyncPosts> = SyncPosts.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ publication: publicationRef, connection, publisherId }) {
      const services = yield* Capability.getAll(BloggerCapabilities.PublisherService);
      const service = yield* resolvePublisherService(services, publisherId);
      const publication = yield* Database.load(publicationRef);
      // Pre-warm each post and its body document/text so `postText` reads the live content during the
      // push reconciliation (cold refs would otherwise push an empty body). Tolerate individual load
      // failures — dangling refs (e.g. a removed post, or pre-redesign posts with no `content`) must
      // not abort the whole sync; `runSyncPosts` reads `ref.target` and skips whatever is unresolved.
      const posts = yield* Effect.forEach(publication.posts ?? [], (ref) =>
        Database.load(ref).pipe(Effect.catchAll(() => Effect.succeed(undefined))),
      );
      yield* Effect.forEach(posts.filter(isNonNullable), (post) =>
        post.content
          ? Database.load(post.content).pipe(
              Effect.flatMap((doc) => (doc?.content ? Database.load(doc.content) : Effect.void)),
              Effect.catchAll(() => Effect.void),
            )
          : Effect.void,
      );

      // Publish a progress monitor when the app registry is present (absent in headless tests);
      // `runSyncPosts` drives it per post/draft, and it is removed when the run settles or fails.
      const registry = (yield* Capability.getAll(AppCapabilities.ProgressRegistry))[0];
      const monitor = registry?.register(`${meta.profile.key}/sync/${publication.id}`, { label: 'Syncing posts…' });
      const result = yield* runSyncPosts(service, publication, connection, (current, total) => {
        monitor?.total(total);
        monitor?.set(current);
      }).pipe(Effect.ensuring(Effect.sync(() => monitor?.remove())));
      return Ref.make(result);
    }),
  ),
);

export default handler;
