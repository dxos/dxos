//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Capability } from '@dxos/app-framework';
import { type Operation } from '@dxos/compute';
import { type Database, Obj, type Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver, resolve } from '@dxos/extractor';
import { type Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Stage } from '@dxos/pipeline';
import { type EmailStage } from '@dxos/pipeline-email';
import { Person } from '@dxos/types';

import { GoogleMail } from '../../../../apis';
import { GMAIL_SOURCE } from '../../../../constants';
import { GoogleMailApi, type GoogleMailApiError } from '../../../../services';
import { Mailbox } from '../../../../types';
import { runMailSync } from '../../../mail-sync';
import { parseFromHeader } from '../../../util';
import { type DecodedMessage, decodeBody, mapToMessage } from '../mapper';
import { GMAIL_SYNC_CONFIG, fetchAttachments, fetchMessages } from './fetch';

export type SyncGmailProps = {
  binding: Ref.Ref<Cursor.Cursor>;
  userId?: string;
  /**
   * Defaults to all mail (every folder incl. Sent) so full conversations sync; a label restricts to
   * that folder. See `fetchMessageIds` for how `'all'` maps to the query.
   */
  label?: string;
  /**
   * Candidate messages this run considers before requesting `Operation.runAgain()`. Test-only
   * override — production uses the default.
   */
  maxMessages?: number;
  /** Reference "now" for window/horizon resolution. Test-only (pins the clock); defaults to `new Date()`. */
  now?: Date;
  /** Overrides the dedup-set seed bound (see `Cursor.layer`). Test-only — shrinks it to reproduce the seed-eviction dedup bug. */
  dedupSeedTail?: number;
};

/**
 * Gmail adapter for the shared mail-sync harness (`runMailSync` in `mail-sync.ts`, which owns the
 * bidirectional/capped/resumable pipeline); this module supplies only the Gmail-specific hooks:
 * the message source (`fetchMessages`), the label→tag map, and the decode/map stages. Mirror of the
 * JMAP adapter (`runJmapSync`). Requires the {@link GoogleMailApi} service rather than providing it,
 * so a test can drive the sync against a mock API + real ECHO db. The return type is written out
 * (not inferred) so the emitted `.d.ts` can name it without expanding unnameable cross-package
 * types (TS2883).
 */
export const syncGmail = ({
  binding,
  userId = 'me',
  label = 'all',
  maxMessages = GMAIL_SYNC_CONFIG.maxItemsPerRun,
  now = new Date(),
  dedupSeedTail,
}: SyncGmailProps): Effect.Effect<
  { newMessages: number },
  GoogleMailApiError | EntityNotFoundError,
  GoogleMailApi | Database.Service | Resolver | Capability.Service | Operation.Service
> =>
  runMailSync<GoogleMail.Message, DecodedMessage, GoogleMailApiError, GoogleMailApi>({
    name: 'gmail',
    config: GMAIL_SYNC_CONFIG,
    foreignKeySource: GMAIL_SOURCE,
    binding,
    maxMessages,
    now,
    dedupSeedTail,
    prepare: ({ mailbox }) =>
      Effect.gen(function* () {
        const labelMap = yield* syncLabels(mailbox, userId).pipe(
          Effect.catchAll((error) => {
            log.catch(error);
            return Effect.succeed(new Map<string, string>());
          }),
        );

        // Resolve the sender contact, build the ECHO message, and map label ids to tag URIs via the
        // Gmail-specific label map.
        const mapToMessageStage: Stage.Stage<DecodedMessage, EmailStage.Mapped, never, Resolver | GoogleMailApi> =
          Stage.map('map-to-message', (decoded: DecodedMessage) =>
            Effect.gen(function* () {
              const fromHeader = decoded.raw.payload.headers.find(({ name }) => name === 'From');
              const from = fromHeader ? parseFromHeader(fromHeader.value) : undefined;
              // Drop filtered messages before the costly attachment fetch; undefined removes the item.
              if (Mailbox.isFiltered(mailbox, { sender: from })) {
                return undefined;
              }
              const contact = from?.email ? yield* resolve(Person.Person, { email: from.email }) : undefined;
              const mapped = mapToMessage(decoded, contact ?? undefined);
              const tagUris = mapped.labelIds.flatMap((labelId) => {
                const uri = labelMap.get(labelId);
                return uri ? [uri] : [];
              });
              const attachments = yield* fetchAttachments(userId, decoded.raw.id, decoded.attachments);
              return {
                message: mapped.message,
                foreignId: decoded.raw.id,
                key: Number.parseInt(decoded.raw.internalDate),
                tagUris,
                attachments,
              };
            }),
          );

        return {
          buildSource: ({ windows, filter, onEnumerated, onRetrieved }) =>
            fetchMessages({ userId, label, windows, searchFilter: filter, onEnumerated, onRetrieved }),
          getForeignId: (message: GoogleMail.Message) => message.id,
          getKey: (message: GoogleMail.Message) => Number.parseInt(message.internalDate),
          decodeBodyStage,
          mapToMessageStage,
        };
      }),
  });

/** Gmail-specific decode stage: base64-decode the body; drop messages with no body. */
const decodeBodyStage: Stage.Stage<GoogleMail.Message, DecodedMessage, never, never> = Stage.map(
  'decode-body',
  (message: GoogleMail.Message) => Effect.sync(() => decodeBody(message) ?? undefined),
);

/**
 * Syncs the Gmail label dictionary to `Tag` objects (one per label, carrying the Gmail label-id as
 * a foreign key). Returns a `gmailLabelId -> Tag uri` map used to index messages by tag.
 */
// TODO(wittjosiah): Migrate this label→Tag sync onto a pipeline too (source: labels; sink:
//   find-or-create Tag), rather than the imperative loop below.
const syncLabels = Effect.fn('gmail-sync.labels')(function* (mailbox: Mailbox.Mailbox, userId: string) {
  const api = yield* GoogleMailApi;
  const { labels } = yield* api.listLabels(userId);
  const labelMap = new Map<string, string>();
  const db = Obj.getDatabase(mailbox);
  if (db) {
    for (const labelItem of labels) {
      const tag = yield* Effect.promise(() =>
        Mailbox.findOrCreateGmailTag(db, { id: labelItem.id, name: labelItem.name }),
      );
      labelMap.set(labelItem.id, Mailbox.tagUri(tag));
    }
  }

  return labelMap;
});
