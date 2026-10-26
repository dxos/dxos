//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';

import { Ref } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';
import { type Cursor } from '@dxos/link';
import * as MailSync from '@dxos/plugin-inbox/MailSync';

import { GoogleCredentials, GoogleMailApi } from '#services';

import { googleMailSyncProvider } from './sync-provider.ts';

/** Syncs one binding's Mailbox from Gmail, authenticating with the binding's own credential. */
export const syncBinding = (binding: Cursor.ExternalCursor, { userId, label }: { userId: string; label: string }) =>
  // Layer stack, top-down: the provider needs GoogleMailApi + Resolver; GoogleMailApi.Live needs
  // the HTTP client + credentials. Chained `Layer.provide` reads as that dependency stack.
  MailSync.runMailSync({ binding: Ref.make(binding) }).pipe(
    Effect.provide(
      googleMailSyncProvider({ userId, label }).pipe(
        Layer.provide(InboxResolver.Live),
        Layer.provide(GoogleMailApi.Live),
        Layer.provide(FetchHttpClient.layer),
        Layer.provide(GoogleCredentials.fromAccessToken(binding.spec.source)),
      ),
    ),
    Effect.withSpan('google-sync'),
  );
