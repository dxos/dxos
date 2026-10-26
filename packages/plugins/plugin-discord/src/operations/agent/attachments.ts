//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { digestHex } from '@dxos/blob';
import { Blob, Database, Obj, type Ref } from '@dxos/echo';
import { File } from '@dxos/types';

import { DiscordBot } from '#types';

/**
 * The files an agent attaches, as the bot fetches them: each File's blob by its key in the content-addressed store
 * (the digest its `ni:` URI names), so only the key crosses to the bot, never the bytes.
 */
export const resolveAttachments = Effect.fnUntraced(function* (
  files: readonly Ref.Ref<File.File>[] | undefined,
): Effect.fn.Return<DiscordBot.Attachment[] | undefined, DiscordBot.DiscordBotError, Database.Service> {
  if (!files || files.length === 0) {
    return undefined;
  }
  const attachments: DiscordBot.Attachment[] = [];
  for (const ref of files) {
    const file = yield* Database.load(ref).pipe(
      Effect.mapError((cause) => new DiscordBot.DiscordBotError({ message: `No such file: ${ref.uri}.`, cause })),
    );
    if (!Obj.instanceOf(File.File, file)) {
      return yield* Effect.fail(new DiscordBot.DiscordBotError({ message: `${ref.uri} is not a File.` }));
    }
    const blob = yield* Database.load(file.data).pipe(
      Effect.mapError(
        (cause) => new DiscordBot.DiscordBotError({ message: `The file ${file.name ?? ref.uri} has no data.`, cause }),
      ),
    );
    if (blob.data._tag !== 'external' || !blob.data.uri.startsWith(`${Blob.Scheme.ni}:///`)) {
      return yield* Effect.fail(
        new DiscordBot.DiscordBotError({
          message: `The file ${file.name ?? ref.uri} is not in blob storage, so it cannot be attached; upload it first.`,
        }),
      );
    }
    if (blob.size > DiscordBot.MAX_ATTACHMENT_BYTES) {
      return yield* Effect.fail(
        new DiscordBot.DiscordBotError({
          message: `The file ${file.name ?? ref.uri} is ${blob.size} bytes; Discord takes at most ${DiscordBot.MAX_ATTACHMENT_BYTES}.`,
        }),
      );
    }
    const uri = blob.data.uri;
    const key = yield* Effect.try({
      try: () => digestHex(uri),
      catch: (cause) =>
        new DiscordBot.DiscordBotError({
          message: `The file ${file.name ?? ref.uri} has a malformed blob URI.`,
          cause,
        }),
    });
    attachments.push({
      key,
      name: file.name ?? 'file',
      ...(blob.type ? { type: blob.type } : {}),
      size: blob.size,
    });
  }
  return attachments;
});
