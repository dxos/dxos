//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database } from '@dxos/echo';
import { CredentialsService } from '@dxos/functions';
import { log } from '@dxos/log';

import type * as Mailbox from '../../types/Mailbox';

/**
 * Service for accessing credentials scoped to a specific mailbox.
 * Provides the Google API token either from the mailbox's access token or falls back to database credentials.
 */
export class MailboxCredentials extends Context.Tag('MailboxCredentials')<
  MailboxCredentials,
  {
    /** Returns the Google API token for this mailbox. */
    get: () => Effect.Effect<string, never, CredentialsService>;
  }
>() {
  /**
   * Creates a credentials layer from a mailbox.
   * Pre-loads the access token during layer construction.
   */
  static layer = (mailbox: Mailbox.Mailbox) =>
    Layer.effect(
      MailboxCredentials,
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
   * Default layer that uses database credentials.
   * Use this for operations that don't have an associated mailbox (e.g., calendar sync, send email).
   */
  static default = Layer.succeed(MailboxCredentials, {
    get: () =>
      Effect.gen(function* () {
        log('using database credentials');
        const credential = yield* CredentialsService.getCredential({ service: 'google.com' });
        return credential.apiKey!;
      }),
  });

  /** Convenience accessor - returns the Google API token. */
  static get = () => Effect.flatMap(MailboxCredentials, (service) => service.get());
}
