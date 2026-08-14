//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';

import { Blog, Publisher } from '#types';

/** The post's linked remote id for `source`, if it has ever been synced there. */
export const linkedId = (post: Blog.Post, source: string): string | undefined => Obj.getKeys(post, source)[0]?.id;

/** The post body: Post -> Markdown.Document -> Text.Text. */
export const postText = (post: Blog.Post): string => post.content.target?.content.target?.content ?? '';

/** Resolves the configured `PublisherService`, preferring `publisherId` when given. */
export const resolvePublisherService = (
  services: readonly Publisher.PublisherService[],
  publisherId: string | undefined,
): Effect.Effect<Publisher.PublisherService, Publisher.PublisherError> => {
  const service = publisherId ? services.find((candidate) => candidate.id === publisherId) : services[0];
  return service
    ? Effect.succeed(service)
    : Effect.fail(new Publisher.PublisherError('No publisher service configured.'));
};

/** Bridges a `PublisherService` promise call into the operation's failure channel. */
export const tryPublisher = <T>(fn: () => Promise<T>): Effect.Effect<T, Publisher.PublisherError> =>
  Effect.tryPromise({
    try: fn,
    catch: (error) => (error instanceof Publisher.PublisherError ? error : new Publisher.PublisherError(String(error))),
  });
