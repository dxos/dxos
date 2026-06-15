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
import { IntegrationProvider as IntegrationProviderCapability, type OnTokenCreated } from '@dxos/plugin-integration';
import { OAuthProvider } from '@dxos/protocols';

import {
  GMAIL_PROVIDER_ID,
  GOOGLE_CALENDAR_PROVIDER_ID,
  GOOGLE_CONTACTS_PROVIDER_ID,
  GOOGLE_INTEGRATION_SOURCE,
} from '../constants';
import { CalendarSyncOptions, InboxOperation, Mailbox, SyncOptions } from '../types';

const GoogleUserInfo = Schema.Struct({
  email: Schema.optional(Schema.String),
});

/**
 * Google `/oauth2/v3/userinfo` email, or `undefined` if missing token, `account` already set, or no email.
 * Callers persist via e.g. `Obj.update`. Tracer disabled on the request (Effect + CORS: https://github.com/Effect-TS/effect/issues/4568).
 */
const getAccountEmail = (accessToken: { token: string; account?: string }) =>
  Effect.gen(function* () {
    if (!accessToken.token || accessToken.account) {
      return undefined;
    }

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
 * Gmail `onTokenCreated`: set account email; ensure one Mailbox (no `getSyncTargets` for mail).
 * Reuses `existingTarget` (`InitializeMailbox`) and applies default name `email ?? 'Inbox'` when unnamed; else creates Mailbox.
 */
const gmailOnTokenCreated: OnTokenCreated = ({ accessToken, integration, existingTarget }) =>
  Effect.gen(function* () {
    const email = yield* getAccountEmail(accessToken);
    if (email) {
      Obj.update(accessToken, (accessToken) => {
        accessToken.account = email;
      });
    }

    const db = Obj.getDatabase(integration);
    if (!db) {
      return;
    }
    const defaultName = email ?? 'Inbox';
    let targetRef: Ref.Ref<Obj.Unknown>;
    if (existingTarget) {
      // Backfill name on the user's existing Mailbox if they hadn't named it.
      const existing = (yield* Effect.promise(() => existingTarget.load())) as Mailbox.Mailbox;
      if (!existing.name) {
        Obj.update(existing, (existing) => {
          existing.name = defaultName;
        });
      }
      targetRef = existingTarget;
    } else {
      const mailbox = Mailbox.make({ name: defaultName });
      db.add(mailbox);
      targetRef = Ref.make(mailbox);
    }
    Obj.update(integration, (integration) => {
      const mutable = integration as Obj.Mutable<typeof integration>;
      mutable.targets = [
        ...mutable.targets,
        {
          object: targetRef,
          options: {} as Record<string, unknown>,
        },
      ];
    });
  }).pipe(Effect.orDie);

const calendarOnTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    const email = yield* getAccountEmail(accessToken);
    if (email) {
      Obj.update(accessToken, (accessToken) => {
        accessToken.account = email;
      });
    }
  }).pipe(Effect.orDie);

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
            // `gmail.modify` is required to move messages to the trash (delete).
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
        },
        optionsSchema: SyncOptions,
        sync: InboxOperation.GoogleMailSync,
        onTokenCreated: gmailOnTokenCreated,
      },
      {
        id: GOOGLE_CALENDAR_PROVIDER_ID,
        source: GOOGLE_INTEGRATION_SOURCE,
        label: 'Google Calendar',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [
            // `calendar.readonly` is required to list the user's calendars (GetGoogleCalendars);
            // `calendar.events` adds read/write on events so draft events can be created remotely.
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
        },
        optionsSchema: CalendarSyncOptions,
        getSyncTargets: InboxOperation.GetGoogleCalendars,
        sync: InboxOperation.GoogleCalendarSync,
        onTokenCreated: calendarOnTokenCreated,
      },
      {
        id: GOOGLE_CONTACTS_PROVIDER_ID,
        source: GOOGLE_INTEGRATION_SOURCE,
        label: 'Google Contacts',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [
            'https://www.googleapis.com/auth/contacts.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
        },
        getSyncTargets: InboxOperation.GetGoogleContactGroups,
        sync: InboxOperation.SyncContacts,
        onTokenCreated: calendarOnTokenCreated,
      },
    ]);
  }),
);
