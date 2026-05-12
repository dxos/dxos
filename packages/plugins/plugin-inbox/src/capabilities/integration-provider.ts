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
import { isTauri } from '@dxos/util';
import {
  type CredentialForm,
  Integration as IntegrationType,
  IntegrationProvider as IntegrationProviderCapability,
  type OnTokenCreated,
} from '@dxos/plugin-integration/types';
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
import {
  GetGoogleCalendars,
  GetGoogleContactGroups,
  ImapSync,
  SyncCalendar,
  SyncContacts,
  SyncMailbox,
} from '../operations/definitions';
import { CalendarSyncOptions, ImapAccountOptions, Mailbox, SyncOptions } from '../types';

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
  password: Schema.String.annotations({
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
    syncBackDays: 30,
    username: '',
    password: '',
  },
  onSubmit: ({ values, provider }) =>
    Effect.sync(() => {
      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: `${IMAP_INTEGRATION_SOURCE_PREFIX}:${values.host}`,
        account: values.username,
        token: values.password,
      });
      const mailbox = Mailbox.make({ name: values.username || provider.label || 'IMAP' });
      const integration = IntegrationType.make({
        name: values.username || `${provider.label ?? 'IMAP'} (${values.host})`,
        providerId: provider.id,
        accessToken: Ref.make(accessToken),
        targets: [
          {
            object: Ref.make(mailbox),
            options: {
              host: values.host,
              port: values.port,
              secure: values.secure,
              folder: values.folder,
              syncBackDays: values.syncBackDays,
              filter: values.filter,
            } as Record<string, unknown>,
          },
        ],
      });
      return { kind: 'complete' as const, accessToken, integration };
    }),
};

const imapOnTokenCreated: OnTokenCreated = ({ integration, existingTarget }) =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(integration);
    if (!db) {
      return;
    }
    // The credential form already attached a Mailbox target; only persist
    // (and optionally swap to an existing one) here.
    const target = integration.targets[0];
    const mailboxRef = target?.object as Ref.Ref<Mailbox.Mailbox> | undefined;
    if (mailboxRef) {
      const mailbox = yield* Effect.promise(() => mailboxRef.load());
      if (Mailbox.instanceOf(mailbox) && db) {
        // Mailbox was already created via Mailbox.make; just ensure it's in
        // the database (`finalizePendingEntry` adds the integration only).
        try {
          db.add(mailbox);
        } catch {
          // Already added — fine.
        }
      }
    }
    if (existingTarget) {
      // Caller passed an existing Mailbox — swap into targets[0].object.
      Obj.update(integration, (mutable) => {
        const next = [...mutable.targets];
        if (next[0]) {
          next[0] = { ...next[0], object: existingTarget };
        }
        (mutable as Obj.Mutable<typeof mutable>).targets = next;
      });
    }
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
        getSyncTargets: GetGoogleContactGroups,
        sync: SyncContacts,
        onTokenCreated: calendarOnTokenCreated,
      },
      // IMAP is gated to the native (Tauri) app for now: the in-tree
      // `node:net` shim only resolves inside the Tauri webview. The plain
      // web build has no reachable socket transport, so we keep the
      // provider hidden until either the desktop app is running or a
      // remote `compute-runtime` target gains `node:net` support.
      ...(isTauri()
        ? [
            {
              id: IMAP_PROVIDER_ID,
              source: IMAP_INTEGRATION_SOURCE_PREFIX,
              label: 'IMAP',
              // No `oauth` — IMAP uses username + password / app password.
              credentialForm: imapCredentialForm,
              optionsSchema: ImapAccountOptions,
              sync: ImapSync,
              onTokenCreated: imapOnTokenCreated,
            },
          ]
        : []),
    ]);
  }),
);
