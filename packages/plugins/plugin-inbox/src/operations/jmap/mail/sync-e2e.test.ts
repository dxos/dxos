//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';

import { Jmap, JmapMail } from '../../../apis';
import { InboxResolver, JmapCredentials } from '../../../services';
import { mapEmail } from './mapper';

/**
 * Live JMAP test against a real server (Fastmail by default). Gated on `JMAP_TOKEN`, mirroring the
 * Gmail `GOOGLE_ACCESS_TOKEN` gate. To run:
 *
 *   export JMAP_TOKEN="<fastmail api token>"   # Settings → Privacy & Security → Integrations
 *   export JMAP_HOST="api.fastmail.com"        # optional; defaults to api.fastmail.com
 *   pnpm vitest sync-e2e.test.ts
 */
const HOST = process.env.JMAP_HOST ?? 'api.fastmail.com';
const TOKEN = process.env.JMAP_TOKEN;

const TestLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  JmapCredentials.fromValues({ host: HOST, token: TOKEN ?? '' }),
  InboxResolver.Mock(),
);

describe.runIf(TOKEN)('JMAP live', { timeout: 30_000 }, () => {
  it.effect(
    'discovers the session, queries the inbox, and maps messages',
    Effect.fnUntraced(function* ({ expect }) {
      const session = yield* Jmap.getSession;
      const accountId = session.primaryAccounts['urn:ietf:params:jmap:mail'];
      if (!accountId) {
        throw new Error('JMAP session has no mail account');
      }
      const target: JmapMail.Target = { apiUrl: session.apiUrl, accountId };

      const { list: folders } = yield* JmapMail.mailboxGet(target);
      const inbox = folders.find((folder) => folder.role === 'inbox');
      if (!inbox) {
        throw new Error('JMAP account has no inbox');
      }

      const { ids } = yield* JmapMail.emailQuery(target, {
        filter: { inMailbox: inbox.id },
        sort: [{ property: 'receivedAt', isAscending: false }],
        limit: 5,
      });
      const { list: emails } = yield* JmapMail.emailGet(target, ids);
      const mapped = (yield* Effect.forEach(emails, (email) => mapEmail(email))).filter(Predicate.isNotNullable);

      console.log(`JMAP live: ${folders.length} folders, ${ids.length} inbox ids, ${mapped.length} mapped messages`);
      expect(Array.isArray(ids)).toBe(true);
    }, Effect.provide(TestLayer)),
  );
});
