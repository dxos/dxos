//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Operation } from '@dxos/compute';
import { withAuthorization } from '@dxos/compute-runtime';
import { Database, Obj } from '@dxos/echo';
import {
  ConnectionTestError,
  Connector,
  type OnCursorCreated,
  type OnTokenCreated,
  type SyncInput,
  type SyncOutput,
  type TestConnection,
} from '@dxos/plugin-connector';
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
import { createSyncRoutine } from '../util';
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

/** `HttpClient.filterStatusOk` failure whose response is a 401/403 — an actual rejected grant. */
const isGoogleAuthRejection = (error: unknown): boolean =>
  Predicate.isRecord(error) &&
  error._tag === 'ResponseError' &&
  Predicate.isRecord(error.response) &&
  (error.response.status === 401 || error.response.status === 403);

/**
 * Google `testConnection`: probe the userinfo endpoint with the stored token. Retries transient
 * failures (network blips, CORS preflight hiccups — see `makeGoogleApiRequest`) the same way real
 * sync does, so a single flaky request doesn't falsely report a healthy credential as expired. Only
 * an actual 401/403 (an expired or revoked grant) is surfaced as "reauthenticate"; any other failure
 * after retries exhausted is reported as a distinct, less alarming message.
 */
const testGoogleConnection: TestConnection = ({ accessToken }) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(accessToken.token, 'Bearer')));
    const httpClientWithTracerDisabled = httpClient.pipe(
      HttpClient.withTracerDisabledWhen(() => true),
      HttpClient.filterStatusOk,
    );

    yield* HttpClientRequest.get('https://www.googleapis.com/oauth2/v3/userinfo').pipe(
      httpClientWithTracerDisabled.execute,
      Effect.scoped,
      Effect.timeout('10 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('1 second').pipe(Schedule.compose(Schedule.recurs(2))),
        while: (error) => !isGoogleAuthRejection(error),
      }),
    );
  }).pipe(
    Effect.mapError(
      (error) =>
        new ConnectionTestError({
          message: isGoogleAuthRejection(error)
            ? 'Google rejected the credential. Reauthenticate to continue syncing.'
            : 'Could not verify the connection. Check your network and try again.',
        }),
    ),
  );

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

/**
 * Sets up recurring background sync for a newly-bound target: a Routine wrapping an every-10-minute
 * local timer Trigger wired to `sync` — the same operation `ConnectorOperation.SyncConnection` invokes
 * directly — with `binding` bound to the newly-created cursor (see `createSyncRoutine`). No-op if a
 * sync routine is already connected to the target.
 */
const onCursorCreated =
  (sync: Operation.Definition<SyncInput, SyncOutput>): OnCursorCreated =>
  ({ target, cursor, db }) =>
    createSyncRoutine({ target, cursor, sync }).pipe(Effect.provide(Database.layer(db)), Effect.asVoid);

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
        onCursorCreated: onCursorCreated(InboxOperation.GoogleMailSync),
        testConnection: testGoogleConnection,
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
        onCursorCreated: onCursorCreated(InboxOperation.JmapSync),
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
        onCursorCreated: onCursorCreated(InboxOperation.GoogleCalendarSync),
        testConnection: testGoogleConnection,
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
        sync: InboxOperation.GoogleContactsSync,
        onTokenCreated,
        testConnection: testGoogleConnection,
      },
    ]);
  }),
);
