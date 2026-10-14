//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSettings from '@dxos/app-toolkit/AppSettings';

import { type Store } from './reconciler.ts';
import { Sync } from './sync.ts';

const NS = 'org.dxos.plugin.markdown';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('Sync', () => {
  test("reseeding against a different object takes its values and publishes this device's own", async ({ expect }) => {
    const first: AppSettings.Namespaces = {};
    const second: AppSettings.Namespaces = { [NS]: { toolbar: false } };
    let shared = first;
    const local = AppSettings.makeDeviceSettings();
    const store: Store = {
      read: () => ({ shared, local }),
      update: (fn) => fn({ shared, local }),
    };

    let value: AppSettings.Values = { toolbar: true, folding: true };
    const sync = new Sync(store);
    sync.bind({
      namespace: NS,
      read: () => value,
      write: async (next) => {
        value = next;
      },
    });
    expect(first[NS]).toEqual({ toolbar: true, folding: true });

    shared = second;
    sync.seed();
    await flush();

    expect(value).toEqual({ toolbar: false, folding: true });
    expect(second[NS]).toEqual({ toolbar: false, folding: true });
  });
});
