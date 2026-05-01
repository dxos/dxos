//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { withAuthorization } from '@dxos/functions';
import {
  IntegrationProvider as IntegrationProviderCapability,
  type OnTokenCreated,
} from '@dxos/plugin-integration/capabilities';
import { OAuthProvider } from '@dxos/protocols';

import { GetGoogleCalendars, SyncCalendar, SyncMailbox } from '../operations/definitions';
import { CalendarSyncOptions, Mailbox, SyncOptions } from '../types';

const GOOGLE_SOURCE = 'google.com';

const GoogleUserInfo = Schema.Struct({
  email: Schema.optional(Schema.String),
});

/**
 * Fills the access token's `account` from Google's `/oauth2/v3/userinfo`.
 * Tracer disabled around the request to work around a CORS issue with
 * traced requests (see https://github.com/Effect-TS/effect/issues/4568).
 */
const fillAccountEmail = (accessToken: { token: string; account?: string }) =>
  Effect.gen(function* () {
    if (!accessToken.token || accessToken.account) return undefined;

    const httpClient = yield* HttpClient.HttpClient.pipe(
      Effect.map(withAuthorization(accessToken.token, 'Bearer')),
    );
    const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

    const userInfo = yield* HttpClientRequest.get('https://www.googleapis.com/oauth2/v3/userinfo').pipe(
      httpClientWithTracerDisabled.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GoogleUserInfo)),
      Effect.scoped,
    );

    return userInfo.email;
  });

/**
 * onTokenCreated for Gmail: fills the account email AND auto-creates the
 * single Mailbox target. Mail integrations have no `getSyncTargets` UI
 * (there's only one inbox per account), so the target is hardcoded here.
 */
const gmailOnTokenCreated: OnTokenCreated = ({ accessToken, integration }) =>
  Effect.gen(function* () {
    const email = yield* fillAccountEmail(accessToken);
    if (email) {
      Obj.change(accessToken, (accessToken) => {
        accessToken.account = email;
      });
    }

    // Hardcode the single Mailbox target. The user can't change which
    // mailbox is synced — there's only one. The actual filter/date-range
    // configuration goes on the target's `options` and is editable via the
    // integration article.
    const db = Obj.getDatabase(integration);
    if (!db) return;
    const mailbox = Mailbox.make({
      name: email ?? 'Inbox',
    });
    db.add(mailbox);
    Obj.change(integration, (integration) => {
      const m = integration as Obj.Mutable<typeof integration>;
      m.targets = [
        ...m.targets,
        {
          object: Ref.make(mailbox),
          options: {} as Record<string, unknown>,
        },
      ];
    });
  }).pipe(Effect.mapError((error) => (error instanceof Error ? error : new Error(String(error)))));

/**
 * onTokenCreated for Calendar / YouTube: just fills the account email.
 * Targets for Calendar are picked via `getSyncTargets` (one per
 * subscribed Google calendar). YouTube has no targets yet (TODO).
 */
const sharedOnTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    const email = yield* fillAccountEmail(accessToken);
    if (email) {
      Obj.change(accessToken, (accessToken) => {
        accessToken.account = email;
      });
    }
  }).pipe(Effect.mapError((error) => (error instanceof Error ? error : new Error(String(error)))));

/**
 * Stable provider ids. Exported so callers (e.g. inbox / calendar
 * `Surface.Surface role='integration--auth'`) can reference them by name.
 */
export const GMAIL_PROVIDER_ID = 'gmail';
export const GOOGLE_CALENDAR_PROVIDER_ID = 'google-calendar';
export const YOUTUBE_PROVIDER_ID = 'youtube';

/**
 * Contributes three `IntegrationProvider` entries for Google services
 * (Gmail, Google Calendar, YouTube). All three share `source: 'google.com'`
 * — they go through the same Google OAuth flow — but request distinct
 * scopes so the resulting AccessToken has only the minimum permissions
 * needed for that service. `IntegrationProvider.id` disambiguates them.
 *
 * Sync ops aren't wired here yet; the existing inbox/calendar handlers
 * remain the source of sync logic until they migrate onto the integration
 * pipeline. YouTube is OAuth-only for now (no sync ops, no targets) — left
 * as a TODO follow-up.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        id: GMAIL_PROVIDER_ID,
        source: GOOGLE_SOURCE,
        label: 'Gmail',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
          note: 'Gmail',
        },
        optionsSchema: SyncOptions,
        sync: SyncMailbox,
        onTokenCreated: gmailOnTokenCreated,
      },
      {
        id: GOOGLE_CALENDAR_PROVIDER_ID,
        source: GOOGLE_SOURCE,
        label: 'Google Calendar',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
          note: 'Google Calendar',
        },
        optionsSchema: CalendarSyncOptions,
        getSyncTargets: GetGoogleCalendars,
        sync: SyncCalendar,
        onTokenCreated: sharedOnTokenCreated,
      },
      {
        id: YOUTUBE_PROVIDER_ID,
        source: GOOGLE_SOURCE,
        label: 'YouTube',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.force-ssl',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
          note: 'YouTube',
        },
        onTokenCreated: sharedOnTokenCreated,
        // TODO(integration-sync): wire `getSyncTargets` + `sync` for YouTube.
      },
    ]);
  }),
);

