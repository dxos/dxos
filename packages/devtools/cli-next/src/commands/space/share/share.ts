//
// Copyright 2025 DXOS.org
//

import { spawn } from 'node:child_process';

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { type Key } from '@dxos/echo';

import { CommandConfig } from '../../../services';
import { getSpace, hostInvitation, print, spaceIdWithDefault } from '../../../util';
import { FormBuilder } from '../../../util';
import { Common } from '../../options';

const copyToClipboard = (text: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => {
      return new Promise<void>((resolve, reject) => {
        const platform = process.platform;
        let command: string;
        let args: string[];

        if (platform === 'darwin') {
          command = 'pbcopy';
          args = [];
        } else if (platform === 'win32') {
          command = 'clip';
          args = [];
        } else {
          command = 'xclip';
          args = ['-selection', 'clipboard'];
        }

        const proc = spawn(command, args);
        proc.stdin?.write(text);
        proc.stdin?.end();

        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else if (platform === 'linux') {
            const proc2 = spawn('xsel', ['--clipboard', '--input']);
            proc2.stdin?.write(text);
            proc2.stdin?.end();
            proc2.on('close', (code2) => {
              if (code2 === 0) {
                resolve();
              } else {
                reject(new Error('Failed to copy to clipboard'));
              }
            });
          } else {
            reject(new Error('Failed to copy to clipboard'));
          }
        });

        proc.on('error', reject);
      });
    },
    catch: (error) => new Error(`Failed to copy to clipboard: ${error}`),
  });

const openBrowser = (url: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => {
      return new Promise<void>((resolve, reject) => {
        const platform = process.platform;
        let command: string;
        let args: string[];

        if (platform === 'darwin') {
          command = 'open';
          args = [url];
        } else if (platform === 'win32') {
          command = 'start';
          args = [url];
        } else {
          command = 'xdg-open';
          args = [url];
        }

        const proc = spawn(command, args);
        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('Failed to open browser'));
          }
        });
        proc.on('error', reject);
      });
    },
    catch: (error) => new Error(`Failed to open browser: ${error}`),
  });

export const handler = Effect.fn(function* ({
  spaceId,
  multiple,
  lifetime,
  open,
  host,
}: {
  spaceId: Option.Option<string>;
  multiple: boolean;
  lifetime: number;
  open: boolean;
  host: string;
}) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;

  const resolvedSpaceId = yield* spaceIdWithDefault(spaceId as Option.Option<Key.SpaceId>);
  const space = yield* getSpace(resolvedSpaceId);

  // Always use persistent and delegated (auth required) due to P2P limitations
  const observable = space.share({
    authMethod: Invitation.AuthMethod.SHARED_SECRET,
    persistent: true,
    lifetime,
    multiUse: multiple,
  });

  const invitation = yield* hostInvitation({
    observable,
    callbacks: {
      onConnecting: (invitation) =>
        Effect.gen(function* () {
          const invitationCode = InvitationEncoder.encode(invitation);
          const authCode = invitation.authCode!;

          // Copy auth code to clipboard
          yield* copyToClipboard(authCode).pipe(Effect.catchAll(() => Effect.void));

          if (!json) {
            yield* Console.log(`\nSecret: ${authCode} (copied to clipboard)\n`);
          }

          if (open) {
            const url = new URL(host);
            url.searchParams.append('spaceInvitationCode', invitationCode);
            yield* openBrowser(url.toString()).pipe(Effect.catchAll(() => Effect.void));
          } else if (!json) {
            yield* Console.log(`\nInvitation: ${invitationCode}\n`);
          }
        }),
    },
    waitForSuccess: true,
  });

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          invitationCode: InvitationEncoder.encode(invitation),
          authCode: invitation.authCode,
          state: Invitation.State[invitation.state],
        },
        null,
        2,
      ),
    );
  } else {
    const builder = FormBuilder.of({ title: 'Space Invitation' })
      .set({ key: 'invitationCode', value: InvitationEncoder.encode(invitation) })
      .set({ key: 'authCode', value: invitation.authCode ?? '<none>' })
      .set({ key: 'state', value: Invitation.State[invitation.state] });
    yield* Console.log(print(builder.build()));
  }
});

export const share = Command.make(
  'share',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    multiple: Options.boolean('multiple', { ifPresent: true }).pipe(
      Options.withDescription('Create a multi-use invitation.'),
    ),
    lifetime: Options.integer('lifetime').pipe(
      Options.withDescription('Lifetime of the invitation in seconds.'),
      Options.withDefault(86400),
    ),
    open: Options.boolean('open', { ifPresent: true }).pipe(Options.withDescription('Open browser with invitation.')),
    host: Options.text('host').pipe(
      Options.withDescription('Application Host URL.'),
      Options.withDefault('https://composer.space'),
    ),
  },
  handler,
).pipe(Command.withDescription('Create space invitation.'));

