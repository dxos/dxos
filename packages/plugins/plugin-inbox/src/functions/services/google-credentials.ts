//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Ref } from '@dxos/echo';
import { CredentialsService } from '@dxos/functions';
import { log } from '@dxos/log';
import { AccessToken } from '@dxos/types';

import type * as Calendar from '../../types/Calendar';
import type * as Mailbox from '../../types/Mailbox';

/**
 * Creates the service interface from a cached token.
 * Falls back to database credentials if no cached token is provided.
 */
const makeService = (cachedToken: string | undefined): Context.Tag.Service<GoogleCredentials> => ({
  get: () =>
    cachedToken
      ? Effect.succeed(cachedToken)
      : Effect.map(CredentialsService.getCredential({ service: 'google.com' }), (c) => c.apiKey!),
});

/**
 * Loads access token from a ref if available.
 */
const loadAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken> | undefined, label: string) =>
  Effect.gen(function* () {
    if (accessTokenRef) {
      const accessToken = yield* Database.Service.load(accessTokenRef);
      if (accessToken?.token) {
        log(`using ${label}-specific access token`, { note: accessToken.note });
        return accessToken.token;
      }
    }
    return undefined;
  });

/**
 * Service for accessing Google API credentials.
 * Provides the Google API token either from an object's access token or falls back to database credentials.
 */
export class GoogleCredentials extends Context.Tag('GoogleCredentials')<
  GoogleCredentials,
  {
    /** Returns the Google API token. */
    get: () => Effect.Effect<string, never, CredentialsService>;
  }
>() {
  /**
   * Creates a credentials layer from a mailbox.
   * Pre-loads the access token during layer construction.
   */
  static fromMailbox = (mailbox: Mailbox.Mailbox) =>
    Layer.effect(
      GoogleCredentials,
      Effect.map(loadAccessToken(mailbox.accessToken, 'mailbox'), makeService),
    );

  /**
   * Creates a credentials layer from a mailbox ref.
   * Loads the mailbox and pre-loads the access token during layer construction.
   */
  static fromMailboxRef = (mailboxRef: Ref.Ref<Mailbox.Mailbox>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.flatMap(Database.Service.load(mailboxRef), (mailbox) =>
        Effect.map(loadAccessToken(mailbox.accessToken, 'mailbox'), makeService),
      ),
    );

  /**
   * Creates a credentials layer from a calendar.
   * Pre-loads the access token during layer construction.
   */
  static fromCalendar = (calendar: Calendar.Calendar) =>
    Layer.effect(
      GoogleCredentials,
      Effect.map(loadAccessToken(calendar.accessToken, 'calendar'), makeService),
    );

  /**
   * Creates a credentials layer from a calendar ref.
   * Loads the calendar and pre-loads the access token during layer construction.
   */
  static fromCalendarRef = (calendarRef: Ref.Ref<Calendar.Calendar>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.flatMap(Database.Service.load(calendarRef), (calendar) =>
        Effect.map(loadAccessToken(calendar.accessToken, 'calendar'), makeService),
      ),
    );

  /**
   * Default layer that uses database credentials.
   * Use this for operations that don't have an associated mailbox or calendar.
   */
  static default = Layer.succeed(GoogleCredentials, makeService(undefined));

  /** Convenience accessor - returns the Google API token. */
  static get = () => Effect.flatMap(GoogleCredentials, (service) => service.get());
}
