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
import { Format } from '@dxos/echo/internal';
import { withAuthorization } from '@dxos/functions';
import {
  type CredentialForm,
  Integration as IntegrationType,
  IntegrationProvider as IntegrationProviderCapability,
  type OnTokenCreated,
} from '@dxos/plugin-integration';
import { OAuthProvider } from '@dxos/protocols';
import { AccessToken } from '@dxos/types';

import {
  GMAIL_PROVIDER_ID,
  GOOGLE_CALENDAR_PROVIDER_ID,
  GOOGLE_CONTACTS_PROVIDER_ID,
  GOOGLE_INTEGRATION_SOURCE,
  IMAP_INTEGRATION_SOURCE_PREFIX,
  IMAP_PROVIDER_ID,
} from '../constants';
import { CalendarSyncOptions, ImapAccountOptions, InboxOperation, Mailbox, SyncOptions } from '../types';

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
const gmailOnTokenCreated: OnTokenCreated = ({ accessTokens, integration, existingTarget }) =>
  Effect.gen(function* () {
    const accessToken = accessTokens[0];
    if (!accessToken) {
      return;
    }
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

/**
 * IMAP credential form schema. Username + password authenticate; host/port/
 * secure/folder/syncBackDays/filter shape the per-target options. The
 * password is split out at submission time onto `AccessToken.token` so it
 * never lives in `Integration.targets[].options`.
 */
const ImapCredentialFormSchema = Schema.Struct({
  ...ImapAccountOptions.fields,
  username: Schema.String.annotations({
    title: 'Username',
    description: 'IMAP login (typically your email address).',
  }),
  password: Format.Password.annotations({
    title: 'Password',
    description: 'IMAP password or app password. Gmail/iCloud require app passwords (2FA).',
  }),
});

type ImapCredentialFormValues = Schema.Schema.Type<typeof ImapCredentialFormSchema>;

const imapCredentialForm: CredentialForm<ImapCredentialFormValues> = {
  schema: ImapCredentialFormSchema,
  defaultValues: {
    host: '',
    port: 993,
    secure: true,
    folder: 'INBOX',
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
    syncBackDays: 30,
    username: '',
    password: '',
  },
  onSubmit: ({ values, provider, existingTarget }) =>
    Effect.sync(() => {
      // Two AccessTokens disambiguated by `source` prefix. Common case: both
      // share the same password (Fastmail / Apple / Gmail-with-app-password).
      // A future UI toggle could allow divergent SMTP passwords.
      const imapToken = Obj.make(AccessToken.AccessToken, {
        source: `${IMAP_INTEGRATION_SOURCE_PREFIX}:${values.host}`,
        account: values.username,
        token: values.password,
      });
      const smtpHost = values.smtpHost || values.host;
      const smtpToken = Obj.make(AccessToken.AccessToken, {
        source: `smtp:${smtpHost}`,
        account: values.username,
        token: values.password,
      });
      // Reuse the mailbox the user came from if there is one; otherwise leave
      // the target.object empty and let `imapOnTokenCreated` materialize a
      // fresh Mailbox after the integration is persisted.
      const targetObject = existingTarget;
      const integration = IntegrationType.make({
        name: values.username || `${provider.label ?? 'IMAP'} (${values.host})`,
        providerId: provider.id,
        accessTokens: [Ref.make(imapToken), Ref.make(smtpToken)],
        targets: [
          {
            ...(targetObject ? { object: targetObject } : {}),
            options: {
              host: values.host,
              port: values.port,
              secure: values.secure,
              folder: values.folder,
              smtpHost,
              smtpPort: values.smtpPort,
              smtpSecure: values.smtpSecure,
              syncBackDays: values.syncBackDays,
              filter: values.filter,
            } as Record<string, unknown>,
          },
        ],
      });
      return { kind: 'complete' as const, accessTokens: [imapToken, smtpToken], integration };
    }),
};

const imapOnTokenCreated: OnTokenCreated = ({ integration, existingTarget, accessTokens }) =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(integration);
    if (!db) {
      return;
    }
    // `onSubmit` left `targets[0].object` unset when no `existingTarget` was
    // provided — materialise a fresh Mailbox here. If a target object is
    // already attached (either the existingTarget plumbed through onSubmit,
    // or a stale value), keep it.
    if (integration.targets[0]?.object) {
      return;
    }
    const primaryToken = accessTokens[0];
    const mailboxName = primaryToken?.account || integration.name || 'IMAP';
    const target = existingTarget ?? Ref.make(db.add(Mailbox.make({ name: mailboxName })));
    Obj.update(integration, (integration) => {
      const next = [...integration.targets];
      next[0] = { ...next[0], object: target };
      (integration as Obj.Mutable<typeof integration>).targets = next;
    });
  }).pipe(Effect.orDie);

const calendarOnTokenCreated: OnTokenCreated = ({ accessTokens }) =>
  Effect.gen(function* () {
    const accessToken = accessTokens[0];
    if (!accessToken) {
      return;
    }
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
        send: InboxOperation.GmailSend,
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
      {
        id: IMAP_PROVIDER_ID,
        source: IMAP_INTEGRATION_SOURCE_PREFIX,
        label: 'IMAP',
        credentialForm: imapCredentialForm,
        optionsSchema: ImapAccountOptions,
        sync: InboxOperation.ImapSync,
        send: InboxOperation.SmtpSend,
        onTokenCreated: imapOnTokenCreated,
      },
    ]);
  }),
);
