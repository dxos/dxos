//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { describe, expect, test } from 'vitest';

import { Entity, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { openAndClose } from '@dxos/test-utils';
import { getDeep } from '@dxos/util';

import { EchoTestBuilder } from '../testing';
import { createDocAccessor } from './doc-accessor';
import { getEditHistory } from './edit-history';
import { clearTimeTravel, setTimeTravel } from './time-travel';
import { getVersion } from './version';

// Builds a DB-backed object whose `title` advances through three committed versions, returning the
// heads frontier at each so tests can pin reads to a historical point.
const setup = async () => {
  const builder = new EchoTestBuilder();
  await openAndClose(builder);
  const { db } = await builder.createDatabase();

  const obj = db.add(Obj.make(TestSchema.Expando, { title: 'v0' }));
  const headsV0 = getVersion(obj).heads;
  Obj.update(obj, (obj: any) => {
    obj.title = 'v1';
  });
  const headsV1 = getVersion(obj).heads;
  Obj.update(obj, (obj: any) => {
    obj.title = 'v2';
  });
  const headsV2 = getVersion(obj).heads;

  return { db, obj, headsV0, headsV1, headsV2 };
};

const titleAt = (obj: Obj.Unknown): unknown => {
  const accessor = createDocAccessor(obj, ['title']);
  return getDeep(accessor.handle.doc(), accessor.path);
};

describe('time travel', () => {
  test('reads resolve historical data while time-traveling, latest after clear', async () => {
    const { obj, headsV0, headsV2 } = await setup();
    expect((obj as any).title).toBe('v2');

    setTimeTravel(obj, headsV0);
    expect(Entity.isTimeTraveling(obj)).toBe(true);
    // Proxy read and the text/doc-accessor read both reflect the historical view.
    expect((obj as any).title).toBe('v0');
    expect(titleAt(obj)).toBe('v0');

    setTimeTravel(obj, headsV2);
    expect((obj as any).title).toBe('v2');

    clearTimeTravel(obj);
    expect(Entity.isTimeTraveling(obj)).toBe(false);
    expect((obj as any).title).toBe('v2');
  });

  test('writes throw while time-traveling', async () => {
    const { obj, headsV0 } = await setup();
    setTimeTravel(obj, headsV0);
    expect(() =>
      Obj.update(obj, (obj: any) => {
        obj.title = 'nope';
      }),
    ).toThrow();
    clearTimeTravel(obj);
    // Editing resumes once live.
    Obj.update(obj, (obj: any) => {
      obj.title = 'v3';
    });
    expect((obj as any).title).toBe('v3');
  });

  test('the full edit history is unaffected by time-traveling', async () => {
    const { obj, headsV0 } = await setup();
    const before = getEditHistory(obj).length;
    setTimeTravel(obj, headsV0);
    expect(getEditHistory(obj).length).toBe(before);
    clearTimeTravel(obj);
    expect(getEditHistory(obj).length).toBe(before);
  });

  test('default subscribers fire on scrub; latestOnly subscribers fire only on real changes', async () => {
    const { obj, headsV0, headsV1 } = await setup();

    let defaultCount = 0;
    let latestCount = 0;
    const unsubscribeDefault = Obj.subscribe(obj, () => {
      defaultCount++;
    });
    const unsubscribeLatest = Obj.subscribe(
      obj,
      () => {
        latestCount++;
      },
      { latestOnly: true },
    );

    // Scrubbing fires the default channel only.
    setTimeTravel(obj, headsV0);
    setTimeTravel(obj, headsV1);
    clearTimeTravel(obj);
    expect(defaultCount).toBe(3);
    expect(latestCount).toBe(0);

    // A real change fires both channels.
    Obj.update(obj, (obj: any) => {
      obj.title = 'v3';
    });
    expect(defaultCount).toBe(4);
    expect(latestCount).toBe(1);

    unsubscribeDefault();
    unsubscribeLatest();
  });

  test('atoms: default reflects history, latestOnly stays latest, timeTravelAtom tracks state', async () => {
    const { obj, headsV0 } = await setup();
    const registry = Registry.make();

    const defaultAtom = Obj.atom(obj);
    const latestAtom = Obj.atom(obj, { latestOnly: true });
    const timeTravelAtom = Entity.timeTravelAtom(obj);

    // Mount the atoms so their subscriptions are live.
    const unsubscribe = [
      registry.subscribe(defaultAtom, () => {}),
      registry.subscribe(latestAtom, () => {}),
      registry.subscribe(timeTravelAtom, () => {}),
    ];

    expect((registry.get(defaultAtom) as any).title).toBe('v2');
    expect((registry.get(latestAtom) as any).title).toBe('v2');
    expect(registry.get(timeTravelAtom)).toBe(false);

    setTimeTravel(obj, headsV0);
    expect((registry.get(defaultAtom) as any).title).toBe('v0');
    expect((registry.get(latestAtom) as any).title).toBe('v2');
    expect(registry.get(timeTravelAtom)).toBe(true);

    clearTimeTravel(obj);
    expect((registry.get(defaultAtom) as any).title).toBe('v2');
    expect(registry.get(timeTravelAtom)).toBe(false);

    unsubscribe.forEach((fn) => fn());
  });
});
