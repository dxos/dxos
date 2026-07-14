//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { withAuthorization } from '@dxos/functions';
import { Connector, type OnTokenCreated } from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';

import {
  GMAIL_CONNECTOR_ID,
  GOOGLE_CALENDAR_CONNECTOR_ID,
  GOOGLE_CONTACTS_CONNECTOR_ID,
  GOOGLE_INTEGRATION_SOURCE,
  JMAP_DEFAULT_HOST,
  JMAP_MAIL_CONNECTOR_ID,
} from '../constants';
import { CalendarSyncOptions, InboxOperation, SyncOptions } from '../types';
import { jmapCredentialForm } from './jmap-credential-form';

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
 * Google `onTokenCreated`: populate `accessToken.account` with the authenticated
 * email so connections/mailboxes get a sensible default name. The sync target is
 * materialized separately (`materializeTarget`) when the binding is created.
 */
const onTokenCreated: OnTokenCreated = ({ accessToken }) =>
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
    return Capability.contributes(Connector, [
      {
        id: GMAIL_CONNECTOR_ID,
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
        // Single-target connector: no `getSyncTargets`. The coordinator calls
        // `materializeTarget` (no remoteTarget) to create the Mailbox, then binds.
        materializeTarget: InboxOperation.MaterializeGmailTarget,
        sync: InboxOperation.GoogleMailSync,
        onTokenCreated,
      },
      {
        id: JMAP_MAIL_CONNECTOR_ID,
        // Nominal default; the real `AccessToken.source` (host) is captured by the credential form.
        source: JMAP_DEFAULT_HOST,
        label: 'JMAP Mail',
        // Non-OAuth: host + email + Bearer API token, validated against the live session on submit.
        credentialForm: jmapCredentialForm,
        optionsSchema: SyncOptions,
        // Single-target connector (the account inbox): no `getSyncTargets`. The coordinator calls
        // `materializeTarget` (no remoteTarget) to create the Mailbox, then binds.
        materializeTarget: InboxOperation.MaterializeJmapTarget,
        sync: InboxOperation.JmapSync,
      },
      {
        id: GOOGLE_CALENDAR_CONNECTOR_ID,
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
        materializeTarget: InboxOperation.MaterializeCalendarTarget,
        sync: InboxOperation.GoogleCalendarSync,
        onTokenCreated,
      },
      {
        id: GOOGLE_CONTACTS_CONNECTOR_ID,
        source: GOOGLE_INTEGRATION_SOURCE,
        label: 'Google Contacts',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [
            'https://www.googleapis.com/auth/contacts.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
        },
        // Targetless connector: no dedicated local root type. `reconcileCursors`
        // binds the connection itself; synced `Person` objects land directly in the
        // space keyed by foreign id.
        getSyncTargets: InboxOperation.GetGoogleContactGroups,
        sync: InboxOperation.SyncContacts,
        onTokenCreated,
      },
    ]);
  }),
);
