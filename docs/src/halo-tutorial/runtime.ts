//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Identity, Space } from '@dxos/halo';
import { type HaloServices } from '@dxos/halo-react';
import { type SpaceId } from '@dxos/keys';

import { openHalo } from './app/App.tsx';

/** The setup an embed starts from. */
export type Scene =
  /** One device with no identity. */
  | 'new'
  /** One device, Alice's, with her name and no spaces. */
  | 'named'
  /** Alice with a space, and Bob with neither. */
  | 'invite'
  /** Alice, Bob and Carol, in Book club together and Alice and Carol in Climbing. */
  | 'book'
  /** Alice's laptop as in `book`, and her phone with no identity. */
  | 'phone'
  /** Alice's laptop as in `book`. */
  | 'laptop';

export const SCENES: readonly Scene[] = [
  'new',
  'named',
  'invite',
  'book',
  'phone',
  'laptop',
];

export const isScene = (value: unknown): value is Scene =>
  SCENES.some((scene) => scene === value);

export type Device = {
  /** The label on the device's frame. */
  readonly label: string;
  readonly hue: string;
  readonly client: Client;
  readonly services: Context.Context<HaloServices>;
};

const HUES = { Alice: 'cyan', Bob: 'amber', Carol: 'violet' } as const;

type Person = keyof typeof HUES;

/**
 * Starts the devices `scene` needs, each an in-memory client on one in-memory
 * network. People the scene needs but does not show still run, so their
 * membership is real.
 */
export const startScene = async (scene: Scene): Promise<Device[]> => {
  const builder = new TestBuilder();
  const start = async (label: string, hue: string): Promise<Device> => {
    const { client, services } = await openHalo(
      builder.createLocalClientServices(),
    );
    return { label, hue, client, services };
  };
  const person = async (name: Person, label = `${name}'s device`) => {
    const device = await start(label, HUES[name]);
    await run(device, Identity.create({ displayName: name }));
    return device;
  };

  switch (scene) {
    case 'new':
      return [await start('Your device', HUES.Alice)];
    case 'named':
      return [await person('Alice')];
    case 'invite': {
      const [alice, bob] = await Promise.all([person('Alice'), person('Bob')]);
      await run(alice, createSpace('Book club'));
      return [alice, bob];
    }
    case 'book':
    case 'phone':
    case 'laptop': {
      const laptop = scene === 'book' ? "Alice's device" : "Alice's laptop";
      const [alice, bob, carol] = await Promise.all([
        person('Alice', laptop),
        person('Bob'),
        person('Carol'),
      ]);
      const bookClub = await run(alice, createSpace('Book club'));
      const climbing = await run(alice, createSpace('Climbing'));
      await admit(alice, bookClub, bob);
      await admit(alice, bookClub, carol);
      await admit(alice, climbing, carol);
      if (scene === 'book') {
        return [alice, bob, carol];
      }
      if (scene === 'phone') {
        return [alice, await start("Alice's phone", HUES.Alice)];
      }
      return [alice];
    }
  }
};

const run = <A, E>(device: Device, effect: Effect.Effect<A, E, HaloServices>) =>
  // eslint-disable-next-line @dxos/rules/no-effect-run-promise -- readers run Effects with the published API.
  Effect.runPromise(effect.pipe(Effect.provide(device.services)));

const createSpace = (name: string) =>
  Effect.gen(function* () {
    const space = yield* Space.create({ name });
    yield* Space.waitReady(space.id);
    return space.id;
  });

/** Lets `guest` into the space `spaceId` of `host`, with no authorization code. */
const admit = async (host: Device, spaceId: SpaceId, guest: Device) => {
  const flow = await run(host, Space.share(spaceId, { authMethod: 'none' }));
  // eslint-disable-next-line @dxos/rules/no-effect-run-promise -- readers run Effects with the published API.
  const code = await Effect.runPromise(flow.code);
  const guestFlow = await run(guest, Space.join(code));
  // eslint-disable-next-line @dxos/rules/no-effect-run-promise -- readers run Effects with the published API.
  await Effect.runPromise(Stream.runDrain(guestFlow.events));
  // The space joins the guest's list a moment after the invitation succeeds.
  await run(
    guest,
    Space.spaces.pipe(
      Stream.filter((spaces) =>
        spaces.some((space) => space.id === spaceId && space.state === 'ready'),
      ),
      Stream.runHead,
    ),
  );
};
