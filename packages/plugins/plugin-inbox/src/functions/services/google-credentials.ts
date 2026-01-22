//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Ref } from '@dxos/echo';
import { CredentialsService } from '@dxos/functions';
import { log } from '@dxos/log';

import type * as Calendar from '../../types/Calendar';
import type * as Mailbox from '../../types/Mailbox';

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
      Effect.gen(function* () {
        // Pre-load token at layer creation time.
        let cachedToken: string | undefined;
        if (mailbox.accessToken) {
          const accessToken = yield* Database.Service.load(mailbox.accessToken);
          if (accessToken?.token) {
            log('using mailbox-specific access token', { note: accessToken.note });
            cachedToken = accessToken.token;
          }
        }

        return {
          get: () =>
            Effect.gen(function* () {
              if (cachedToken) {
                return cachedToken;
              }
              // Fall back to database credentials for google.com.
              log('using database credentials');
              const credential = yield* CredentialsService.getCredential({ service: 'google.com' });
              return credential.apiKey!;
            }),
        };
      }),
    );

  /**
   * Creates a credentials layer from a mailbox ref.
   * Loads the mailbox and pre-loads the access token during layer construction.
   */
  static fromMailboxRef = (mailboxRef: Ref.Ref<Mailbox.Mailbox>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.gen(function* () {
        const mailbox = yield* Database.Service.load(mailboxRef);
        // Pre-load token at layer creation time.
        let cachedToken: string | undefined;
        if (mailbox.accessToken) {
          const accessToken = yield* Database.Service.load(mailbox.accessToken);
          if (accessToken?.token) {
            log('using mailbox-specific access token', { note: accessToken.note });
            cachedToken = accessToken.token;
          }
        }

        return {
          get: () =>
            Effect.gen(function* () {
              if (cachedToken) {
                return cachedToken;
              }
              // Fall back to database credentials for google.com.
              log('using database credentials');
              const credential = yield* CredentialsService.getCredential({ service: 'google.com' });
              return credential.apiKey!;
            }),
        };
      }),
    );

  /**
   * Creates a credentials layer from a calendar.
   * Pre-loads the access token during layer construction.
   */
  static fromCalendar = (calendar: Calendar.Calendar) =>
    Layer.effect(
      GoogleCredentials,
      Effect.gen(function* () {
        // Pre-load token at layer creation time.
        let cachedToken: string | undefined;
        if (calendar.accessToken) {
          const accessToken = yield* Database.Service.load(calendar.accessToken);
          if (accessToken?.token) {
            log('using calendar-specific access token', { note: accessToken.note });
            cachedToken = accessToken.token;
          }
        }

        return {
          get: () =>
            Effect.gen(function* () {
              if (cachedToken) {
                return cachedToken;
              }
              // Fall back to database credentials for google.com.
              log('using database credentials');
              const credential = yield* CredentialsService.getCredential({ service: 'google.com' });
              return credential.apiKey!;
            }),
        };
      }),
    );

  /**
   * Creates a credentials layer from a calendar ref.
   * Loads the calendar and pre-loads the access token during layer construction.
   */
  static fromCalendarRef = (calendarRef: Ref.Decoded<Calendar.Calendar>) =>
    Layer.effect(
      GoogleCredentials,
      Effect.gen(function* () {
        const calendar = yield* Database.Service.load(calendarRef);
        // Pre-load token at layer creation time.
        let cachedToken: string | undefined;
        if (calendar.accessToken) {
          const accessToken = yield* Database.Service.load(calendar.accessToken);
          if (accessToken?.token) {
            log('using calendar-specific access token', { note: accessToken.note });
            cachedToken = accessToken.token;
          }
        }

        return {
          get: () =>
            Effect.gen(function* () {
              if (cachedToken) {
                return cachedToken;
              }
              // Fall back to database credentials for google.com.
              log('using database credentials');
              const credential = yield* CredentialsService.getCredential({ service: 'google.com' });
              return credential.apiKey!;
            }),
        };
      }),
    );

  /**
   * Default layer that uses database credentials.
   * Use this for operations that don't have an associated mailbox or calendar.
   */
  static default = Layer.succeed(GoogleCredentials, {
    get: () =>
      Effect.gen(function* () {
        log('using database credentials');
        const credential = yield* CredentialsService.getCredential({ service: 'google.com' });
        return credential.apiKey!;
      }),
  });

  /** Convenience accessor - returns the Google API token. */
  static get = () => Effect.flatMap(GoogleCredentials, (service) => service.get());
}
