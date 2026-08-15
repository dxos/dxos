//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as AppSettings from '@dxos/app-toolkit/AppSettings';

import { Reconciler, type Store } from './binding';

const DEVICE = 'device-a';
const NS = 'org.dxos.plugin.markdown';

/** In-memory stand-in for the ECHO settings object, with the notification ECHO would deliver. */
const makeStore = () => {
  const state: AppSettings.Draft = { shared: {}, devices: {} };
  const listeners: (() => void)[] = [];
  const store: Store = {
    read: () => state,
    update: (fn) => {
      fn(state);
      listeners.forEach((listener) => listener());
    },
  };

  return { state, store, subscribe: (listener: () => void) => listeners.push(listener) };
};

/** Local side of a binding: a plain value cell that notifies on write, like a settings atom. */
const makeLocal = (initial: AppSettings.Values, namespace: string = NS) => {
  let value = initial;
  const listeners: (() => void)[] = [];
  return {
    get: () => value,
    /** A local edit, as the user makes it. */
    set: (next: AppSettings.Values) => {
      value = next;
      listeners.forEach((listener) => listener());
    },
    binding: {
      namespace,
      read: () => value,
      write: (next: AppSettings.Values) => {
        value = next;
        listeners.forEach((listener) => listener());
      },
    },
    subscribe: (listener: () => void) => listeners.push(listener),
  };
};

/** Wire both directions the way the sync module does. */
const bind = (store: ReturnType<typeof makeStore>, local: ReturnType<typeof makeLocal>) => {
  const reconciler = new Reconciler(store.store, DEVICE, local.binding);
  reconciler.seed();
  local.subscribe(() => reconciler.push());
  store.subscribe(() => reconciler.pull());
  return reconciler;
};

describe('Reconciler', () => {
  test('seeding adopts settings this device already had', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true, folding: false });
    bind(store, local);

    expect(store.state.shared[NS]).toEqual({ toolbar: true, folding: false });
  });

  test('seeding prefers the account over the joining device', () => {
    const store = makeStore();
    store.state.shared[NS] = { toolbar: false };
    const local = makeLocal({ toolbar: true, folding: true });
    bind(store, local);

    expect(local.get()).toEqual({ toolbar: false, folding: true });
    expect(store.state.shared[NS]).toEqual({ toolbar: false, folding: true });
  });

  test('a local edit reaches the shared layer', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    bind(store, local);

    local.set({ toolbar: false });

    expect(store.state.shared[NS]).toEqual({ toolbar: false });
  });

  test('a local edit to a pinned key stays on this device', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const reconciler = bind(store, local);

    store.store.update((draft) => AppSettings.pin(draft, DEVICE, NS, 'toolbar', reconciler.current().toolbar));
    local.set({ toolbar: false });

    expect(store.state.shared[NS]).toEqual({ toolbar: true });
    expect(store.state.devices[DEVICE].overrides[NS]).toEqual({ toolbar: false });
  });

  test('a change from another device lands locally', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    bind(store, local);

    store.store.update((draft) => AppSettings.setValue(draft, 'device-b', NS, 'toolbar', false));

    expect(local.get()).toEqual({ toolbar: false });
  });

  test('a pinned key ignores a change from another device', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const reconciler = bind(store, local);

    store.store.update((draft) => AppSettings.pin(draft, DEVICE, NS, 'toolbar', reconciler.current().toolbar));
    store.store.update((draft) => AppSettings.setValue(draft, 'device-b', NS, 'toolbar', false));

    expect(local.get()).toEqual({ toolbar: true });
  });

  test('applying a remote change does not echo back as a local edit', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    bind(store, local);

    store.store.update((draft) => AppSettings.setValue(draft, 'device-b', NS, 'toolbar', false));
    // The echo would have re-derived the value from the local cell and written it to the shared
    // layer as though the user had made the edit here.
    expect(store.state.shared[NS]).toEqual({ toolbar: false });
    expect(store.state.devices[DEVICE]).toBeUndefined();
  });

  test('the plugin set rides the same reconciliation, keyed by plugin id', () => {
    const markdown = 'org.dxos.plugin.markdown';
    const chess = 'org.dxos.plugin.chess';
    const store = makeStore();
    const here = makeLocal({ [markdown]: true, [chess]: false }, AppSettings.PLUGINS_NAMESPACE);
    const there = makeLocal({ [markdown]: true, [chess]: false }, AppSettings.PLUGINS_NAMESPACE);
    bind(store, here);
    const other = new Reconciler(store.store, 'device-b', there.binding);
    other.seed();
    there.subscribe(() => other.push());

    // Enabling chess on the other device enables it here too.
    there.set({ [markdown]: true, [chess]: true });

    expect(AppSettings.getEnabledPlugins(here.get()).sort()).toEqual([chess, markdown]);
  });

  test('a plugin pinned here ignores the same toggle made elsewhere', () => {
    const markdown = 'org.dxos.plugin.markdown';
    const chess = 'org.dxos.plugin.chess';
    const store = makeStore();
    const here = makeLocal({ [markdown]: true, [chess]: false }, AppSettings.PLUGINS_NAMESPACE);
    const there = makeLocal({ [markdown]: true, [chess]: false }, AppSettings.PLUGINS_NAMESPACE);
    bind(store, here);
    const other = new Reconciler(store.store, 'device-b', there.binding);
    other.seed();
    there.subscribe(() => other.push());

    store.store.update((draft) => AppSettings.pin(draft, DEVICE, AppSettings.PLUGINS_NAMESPACE, chess, false));
    there.set({ [markdown]: true, [chess]: true });

    expect(AppSettings.getEnabledPlugins(here.get())).toEqual([markdown]);
    expect(AppSettings.getEnabledPlugins(there.get()).sort()).toEqual([chess, markdown]);
  });
});
