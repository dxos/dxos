//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DebugModel } from './debug-model';

describe('DebugModel', () => {
  test('reads every registered probe in one pass', () => {
    const model = new DebugModel();
    let fps = 60;
    model.register({ id: 'fps', read: () => fps });
    model.register({ id: 'rows', read: () => 22 });

    expect(model.read()).to.deep.eq({ fps: 60, rows: 22 });
    fps = 12;
    // Values are pulled, never pushed: the probe reads live state through its closure.
    expect(model.read()).to.deep.eq({ fps: 12, rows: 22 });
  });

  test('registration is the only event', () => {
    const model = new DebugModel();
    let events = 0;
    model.subscribe(() => events++);

    const unregister = model.register({ id: 'fps', read: () => 60 });
    model.read();
    model.read();
    unregister();

    // Two registrations changes, zero value events — sixty reads a second are the table's cost.
    expect(events).to.eq(2);
    expect(model.probes()).to.deep.eq([]);
  });
});
