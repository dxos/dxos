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
} from '@dxos/plugin-integration/types';
import { OAuthProvider } from '@dxos/protocols';

import { GOOGLE_INTEGRATION_SOURCE } from '../constants';
import { GetGoogleCalendars, SyncCalendar, SyncMailbox } from '../operations/definitions';
import { CalendarSyncOptions, Mailbox, SyncOptions } from '../types';

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
    if (!accessToken.token || accessToken.account) {return undefined;}

    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(accessToken.token, 'Bearer')));
    const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

    const userInfo = yield* HttpClientRequest.get('https://www.googleapis.com/oauth2/v3/userinfo').pipe(
      httpClientWithTracerDisabled.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GoogleUserInfo)),
      Effect.scoped,
    );

    return userInfo.email;
  });

/**
 * onTokenCreated for Gmail: fills the account email AND attaches the single
 * Mailbox target. Mail integrations have no `getSyncTargets` UI (there's
 * only one inbox per account), so the target is wired up here. When
 * `existingTarget` is provided (e.g. the auth flow was initiated from
 * `InitializeMailbox` on an existing Mailbox), the existing object is
 * reused — and given the same default name a freshly-created Mailbox would
 * have (`email ?? 'Inbox'`) when its `name` is unset. Otherwise a fresh
 * Mailbox is created.
 */
const gmailOnTokenCreated: OnTokenCreated = ({ accessToken, integration, existingTarget }) =>
  Effect.gen(function* () {
    const email = yield* fillAccountEmail(accessToken);
    if (email) {
      Obj.change(accessToken, (accessToken) => {
        accessToken.account = email;
      });
    }

    const db = Obj.getDatabase(integration);
    if (!db) {return;}
    const defaultName = email ?? 'Inbox';
    let targetRef: Ref.Ref<Obj.Unknown>;
    if (existingTarget) {
      // Backfill name on the user's existing Mailbox if they hadn't named it.
      const existing = (yield* Effect.promise(() => existingTarget.load())) as Mailbox.Mailbox;
      if (!existing.name) {
        Obj.change(existing, (existing) => {
          existing.name = defaultName;
        });
      }
      targetRef = existingTarget;
    } else {
      const mailbox = Mailbox.make({ name: defaultName });
      db.add(mailbox);
      targetRef = Ref.make(mailbox);
    }
    Obj.change(integration, (integration) => {
      const mutable = integration as Obj.Mutable<typeof integration>;
      mutable.targets = [
        ...mutable.targets,
        {
          object: targetRef,
          options: {} as Record<string, unknown>,
        },
      ];
    });
  }).pipe(Effect.mapError((error) => (error instanceof Error ? error : new Error(String(error)))));

const calendarOnTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    const email = yield* fillAccountEmail(accessToken);
    if (email) {
      Obj.change(accessToken, (accessToken) => {
        accessToken.account = email;
      });
    }
  }).pipe(Effect.mapError((error) => (error instanceof Error ? error : new Error(String(error)))));

/**
 * Stable provider ids for auth surfaces (`role: 'integration--auth'`).
 */
export const GMAIL_PROVIDER_ID = 'gmail';

export const GOOGLE_CALENDAR_PROVIDER_ID = 'google-calendar';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        id: GMAIL_PROVIDER_ID,
        source: GOOGLE_INTEGRATION_SOURCE,
        label: 'Gmail',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
        },
        optionsSchema: SyncOptions,
        sync: SyncMailbox,
        onTokenCreated: gmailOnTokenCreated,
      },
      {
        id: GOOGLE_CALENDAR_PROVIDER_ID,
        source: GOOGLE_INTEGRATION_SOURCE,
        label: 'Google Calendar',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
        },
        optionsSchema: CalendarSyncOptions,
        getSyncTargets: GetGoogleCalendars,
        sync: SyncCalendar,
        onTokenCreated: calendarOnTokenCreated,
      },
    ]);
  }),
);
