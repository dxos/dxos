//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';
import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { ServiceResolver } from '@dxos/compute';
import { Imap, ImapError, Smtp, SmtpError } from '@dxos/functions';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { InboxPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('InboxPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), InboxPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('CreateObject'), moduleId('schema'), moduleId('OperationHandler')]),
    );

    // The mail-services LayerSpec activates lazily with the process manager.
    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toContain(moduleId('MailServices'));
  });

  // Regression guard: composer-side, IMAP/SMTP operations execute locally (no edge bundle deployed),
  // so the runtime must provide `Imap`/`Smtp`. Without the MailServices LayerSpec these tags resolve
  // to no provider and the process dies with a defect; with it they fail fast as `unavailable`.
  test('mail services resolve to the fail-fast unavailable sentinels', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), InboxPlugin()],
    });
    await harness.fire(ActivationEvents.SetupProcessManager);

    const imapError = await harness.runPromise(
      Imap.connect({
        host: 'imap.example.com',
        port: 993,
        secure: true,
        username: 'user',
        password: Redacted.make('secret'),
      }).pipe(Effect.scoped, Effect.flip, Effect.provide(ServiceResolver.provide({}, Imap))),
    );
    expect(imapError).toBeInstanceOf(ImapError);
    expect((imapError as ImapError).reason).toBe('unavailable');

    const smtpError = await harness.runPromise(
      Smtp.send(
        { host: 'smtp.example.com', port: 587, username: 'user', password: Redacted.make('secret') },
        { from: 'me@example.com', to: ['you@example.com'], rfc822: 'Subject: hi\r\n\r\nbody' },
      ).pipe(Effect.flip, Effect.provide(ServiceResolver.provide({}, Smtp))),
    );
    expect(smtpError).toBeInstanceOf(SmtpError);
    expect((smtpError as SmtpError).reason).toBe('unavailable');
  });
});
