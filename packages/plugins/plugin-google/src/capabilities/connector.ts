//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';

import * as Capability from '@dxos/app-framework/Capability';
import { withAuthorization } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import * as Trigger from '@dxos/compute/Trigger';
import { Obj, Type } from '@dxos/echo';
import { ConnectionTestError } from '@dxos/plugin-connector';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as Calendar from '@dxos/plugin-inbox/Calendar';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { MAIL_AUTO_SYNC, MAIL_REMOTE_SYNC, MAIL_SYNC_CRON } from '@dxos/plugin-inbox/sync';
import * as SyncOptions from '@dxos/plugin-inbox/SyncOptions';
import { OAuthProvider } from '@dxos/protocols';

import { GoogleOperation } from '#types';

import {
  GMAIL_CONNECTOR_ID,
  GOOGLE_CALENDAR_CONNECTOR_ID,
  GOOGLE_CONTACTS_CONNECTOR_ID,
  GOOGLE_INTEGRATION_SOURCE,
} from '../constants';
import { GMAIL_OAUTH_SCOPES, GOOGLE_CALENDAR_OAUTH_SCOPES, GOOGLE_CONTACTS_OAUTH_SCOPES } from '../scopes';

const GoogleUserInfo = Schema.Struct({
  email: Schema.optional(Schema.String),
});

/**
 * Google `/oauth2/v3/userinfo` email, or `undefined` if missing token, `account` already set, or no email.
 * Callers persist via e.g. `Obj.update`. Tracer disabled on the request (Effect + CORS: https://github.com/Effect-TS/effect/issues/4568).
 */
const getAccountEmail = (token: string, account: string | undefined) =>
  Effect.gen(function* () {
    if (!token || account) {
      return undefined;
    }

    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
    const httpClientWithTracerDisabled = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
    );

    const userInfo = yield* HttpClientRequest.get('https://www.googleapis.com/oauth2/v3/userinfo').pipe(
      httpClientWithTracerDisabled.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(GoogleUserInfo)),
      Effect.scoped,
    );

    return userInfo.email;
  });

/** `HttpClient.filterStatusOk` failure whose response is a 401/403 — an actual rejected grant. */
const isGoogleAuthRejection = (error: unknown): boolean =>
  Predicate.isObject(error) &&
  error._tag === 'ResponseError' &&
  Predicate.isObject(error.response) &&
  (error.response.status === 401 || error.response.status === 403);

/**
 * Google `testConnection`: probe the userinfo endpoint with the stored token. Retries transient
 * failures (network blips, CORS preflight hiccups — see `makeGoogleApiRequest`) the same way real
 * sync does, so a single flaky request doesn't falsely report a healthy credential as expired. Only
 * an actual 401/403 (an expired or revoked grant) is surfaced as "reauthenticate"; any other failure
 * after retries exhausted is reported as a distinct, less alarming message.
 */
const testGoogleConnection: ConnectorSpec.TestConnection = ({ accessToken }) =>
  Effect.gen(function* () {
    const token = yield* Credential.getApiKeyValue({ accessTokenId: accessToken.id });
    const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
    const httpClientWithTracerDisabled = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
      HttpClient.filterStatusOk,
    );

    yield* HttpClientRequest.get('https://www.googleapis.com/oauth2/v3/userinfo').pipe(
      httpClientWithTracerDisabled.execute,
      Effect.scoped,
      Effect.timeout('10 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('1 second').pipe(Schedule.upTo({ times: 2 })),
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
const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    const email = yield* getAccountEmail(
      yield* Credential.getApiKeyValue({ accessTokenId: accessToken.id }),
      accessToken.account,
    );
    if (email) {
      Obj.update(accessToken, (accessToken) => {
        accessToken.account = email;
      });
    }
  }).pipe(Effect.orDie);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: GMAIL_CONNECTOR_ID,
        source: GOOGLE_INTEGRATION_SOURCE,
        label: 'Gmail',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [...GMAIL_OAUTH_SCOPES],
        },
        sync: {
          operation: GoogleOperation.GoogleMailSync,
          // What this connector binds — how `Mailbox` discovers it without naming Gmail.
          targetTypename: Type.getTypename(Mailbox.Mailbox),
          // Single-target connector: no `getTargets`. The coordinator calls `materializeTarget`
          // (no remoteTarget) to create the Mailbox, then binds.
          materializeTarget: GoogleOperation.MaterializeGmailTarget,
          optionsSchema: SyncOptions.SyncOptions,
          auto: MAIL_AUTO_SYNC,
          trigger: Trigger.specTimer(MAIL_SYNC_CRON),
          remote: MAIL_REMOTE_SYNC,
        },
        onTokenCreated,
        testConnection: testGoogleConnection,
      },
      {
        id: GOOGLE_CALENDAR_CONNECTOR_ID,
        source: GOOGLE_INTEGRATION_SOURCE,
        label: 'Google Calendar',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [...GOOGLE_CALENDAR_OAUTH_SCOPES],
        },
        sync: {
          operation: GoogleOperation.GoogleCalendarSync,
          targetTypename: Type.getTypename(Calendar.Calendar),
          getTargets: GoogleOperation.GetGoogleCalendars,
          materializeTarget: GoogleOperation.MaterializeGoogleCalendarTarget,
          optionsSchema: SyncOptions.CalendarSyncOptions,
        },
        onTokenCreated,
        testConnection: testGoogleConnection,
      },
      {
        id: GOOGLE_CONTACTS_CONNECTOR_ID,
        source: GOOGLE_INTEGRATION_SOURCE,
        label: 'Google Contacts',
        oauth: {
          provider: OAuthProvider.GOOGLE,
          scopes: [...GOOGLE_CONTACTS_OAUTH_SCOPES],
        },
        sync: {
          // Targetless: no `targetTypename`, since synced `Person` objects land directly in the space
          // rather than under a bound root.
          operation: GoogleOperation.GoogleContactsSync,
          getTargets: GoogleOperation.GetGoogleContactGroups,
          // Targetless connector: no dedicated local root type, so no `materializeTarget`.
          // `reconcileCursors` binds the connection itself; synced `Person` objects land directly in
          // the space keyed by foreign id.
        },
        onTokenCreated,
        testConnection: testGoogleConnection,
      },
    ]);
  }),
);
