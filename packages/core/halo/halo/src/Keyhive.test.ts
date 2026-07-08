//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Keyhive from './Keyhive';

describe('Keyhive prototype', () => {
  test('group creation makes the creator root admin', async ({ expect }) => {
    const peer = await Keyhive.make();
    const group = await EffectEx.runPromise(peer.createGroup());
    const members = await EffectEx.runPromise(peer.members(group));
    expect(members).toEqual([{ subject: peer.active, access: 'admin' }]);
  });

  test('contact card exchange and attenuated delegation', async ({ expect }) => {
    const host = await Keyhive.make();
    const guest = await Keyhive.make();

    const subject = await EffectEx.runPromise(
      Effect.flatMap(guest.contactCard(), (card) => host.receiveContactCard(card)),
    );
    const group = await EffectEx.runPromise(host.createGroup());
    await EffectEx.runPromise(host.delegate({ group, subject, access: 'edit' }));

    const members = await EffectEx.runPromise(host.members(group));
    expect(members.find((member) => member.subject === guest.active)?.access).toBe('edit');
  });

  test('delegation above own access is rejected', async ({ expect }) => {
    // Guest is admitted with 'read'; after replaying the group ops it must not be able to
    // delegate 'admin' (attenuation: delegate at most your own effective access).
    const host = await Keyhive.make();
    const guest = await Keyhive.make();
    const third = await Keyhive.make();

    const subject = await EffectEx.runPromise(
      Effect.flatMap(guest.contactCard(), (card) => host.receiveContactCard(card)),
    );
    const group = await EffectEx.runPromise(host.createGroup());
    await EffectEx.runPromise(host.delegate({ group, subject, access: 'read' }));

    await EffectEx.runPromise(Effect.flatMap(host.ops(group), (ops) => guest.receiveOps(ops)));
    const thirdId = await EffectEx.runPromise(
      Effect.flatMap(third.contactCard(), (card) => guest.receiveContactCard(card)),
    );
    const result = await EffectEx.runPromise(
      guest
        .delegate({ group, subject: thirdId, access: 'admin' })
        .pipe(Effect.catchTag('NotAuthorizedError', () => Effect.succeed('rejected' as const))),
    );
    expect(result).toBe('rejected');
  });

  test('tampered contact card is rejected', async ({ expect }) => {
    const host = await Keyhive.make();
    const guest = await Keyhive.make();

    const card = await EffectEx.runPromise(guest.contactCard());
    const result = await EffectEx.runPromise(
      host
        .receiveContactCard({ ...card, shareKey: card.shareKey.replace(/^../, 'ff') })
        .pipe(Effect.catchTag('InvalidSignatureError', () => Effect.succeed('rejected' as const))),
    );
    expect(result).toBe('rejected');
  });

  test('revocation removes member; re-add must causally succeed removal', async ({ expect }) => {
    const host = await Keyhive.make();
    const guest = await Keyhive.make();

    const subject = await EffectEx.runPromise(
      Effect.flatMap(guest.contactCard(), (card) => host.receiveContactCard(card)),
    );
    const group = await EffectEx.runPromise(host.createGroup());
    await EffectEx.runPromise(host.delegate({ group, subject, access: 'read' }));
    await EffectEx.runPromise(host.revoke({ group, subject }));

    const afterRevoke = await EffectEx.runPromise(host.members(group));
    expect(afterRevoke.some((member) => member.subject === guest.active)).toBe(false);

    // Re-add causally succeeds the revocation (heads include it), so it is valid.
    await EffectEx.runPromise(host.delegate({ group, subject, access: 'read' }));
    const afterReAdd = await EffectEx.runPromise(host.members(group));
    expect(afterReAdd.some((member) => member.subject === guest.active)).toBe(true);
  });

  test('ops replicate to a second peer and converge', async ({ expect }) => {
    const host = await Keyhive.make();
    const guest = await Keyhive.make();

    const group = await EffectEx.runPromise(host.createGroup());
    const subject = await EffectEx.runPromise(
      Effect.flatMap(guest.contactCard(), (card) => host.receiveContactCard(card)),
    );
    await EffectEx.runPromise(host.delegate({ group, subject, access: 'edit' }));

    await EffectEx.runPromise(Effect.flatMap(host.ops(group), (ops) => guest.receiveOps(ops)));
    const hostView = await EffectEx.runPromise(host.members(group));
    const guestView = await EffectEx.runPromise(guest.members(group));
    expect(guestView).toEqual(hostView);
  });

  test('service is usable via Effect layer', async ({ expect }) => {
    const members = await EffectEx.runPromise(
      Effect.gen(function* () {
        const service = yield* Keyhive.Service;
        const group = yield* service.createGroup();
        return yield* service.members(group);
      }).pipe(Effect.provide(Keyhive.layerMemory())),
    );
    expect(members).toHaveLength(1);
  });
});
