//
// Copyright 2026 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

const handler = Effect.fn(function* ({ invitation: code }: { invitation: string }) {
  const client = yield* ClientService;
  const observable = client.halo.join(InvitationEncoder.decode(code));
  yield* Effect.async<void, Error>((resume) => {
    const subscription = observable.subscribe(
      (invitation: Invitation) => {
        if (invitation.state === Invitation.State.SUCCESS) {
          resume(Effect.void);
        }
      },
      (err: unknown) => resume(Effect.fail(err instanceof Error ? err : new Error(String(err)))),
    );
    return Effect.sync(() => subscription.unsubscribe());
  }).pipe(Effect.timeout('2 minutes'));
  yield* Console.log('Device joined — your spaces will replicate to this profile.');
});

export const join = Command.make(
  'join',
  {
    invitation: Args.text({ name: 'invitation' }).pipe(
      Args.withDescription('Encoded device-invitation code (create one in Composer: Devices → Add device).'),
    ),
  },
  handler,
).pipe(Command.withDescription('Join your existing identity by accepting a device invitation (headless device join).'));
