//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as AppSettings from '@dxos/app-toolkit/AppSettings';

import { Reconciler, type Store } from './reconciler';

const NS = 'org.dxos.plugin.markdown';

/**
 * In-memory stand-in for the two halves a store spans: one shared layer, and one set of pins per
 * device. Devices share the `shared` object and its notifications, as replication gives them.
 */
const makeStore = () => {
  const shared: AppSettings.Namespaces = {};
  const listeners: (() => void)[] = [];

  /** One device's view: the common shared layer plus pins of its own. */
  const device = () => {
    const local = AppSettings.makeDeviceSettings();
    const store: Store = {
      read: () => ({ shared, local }),
      update: (fn) => {
        fn({ shared, local });
        listeners.forEach((listener) => listener());
      },
    };
    return { store, local };
  };

  return { shared, device, subscribe: (listener: () => void) => listeners.push(listener) };
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
      subscribe: (onChange: () => void) => {
        listeners.push(onChange);
        return () => {};
      },
    },
  };
};

/** Wire both directions the way the sync module does, for one device's view of the store. */
const bindTo = (
  store: ReturnType<typeof makeStore>,
  view: ReturnType<ReturnType<typeof makeStore>['device']>,
  local: ReturnType<typeof makeLocal>,
) => {
  const reconciler = new Reconciler(view.store, local.binding);
  reconciler.seed();
  local.binding.subscribe(() => reconciler.push());
  store.subscribe(() => reconciler.pull());
  return reconciler;
};

describe('Reconciler', () => {
  test('seeding adopts settings this device already had', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true, folding: false });
    const view = store.device();
    bindTo(store, view, local);

    expect(store.shared[NS]).toEqual({ toolbar: true, folding: false });
  });

  test('seeding prefers the account over the joining device', () => {
    const store = makeStore();
    store.shared[NS] = { toolbar: false };
    const local = makeLocal({ toolbar: true, folding: true });
    const view = store.device();
    bindTo(store, view, local);

    expect(local.get()).toEqual({ toolbar: false, folding: true });
    expect(store.shared[NS]).toEqual({ toolbar: false, folding: true });
  });

  test('a local edit reaches the shared layer', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    bindTo(store, view, local);

    local.set({ toolbar: false });

    expect(store.shared[NS]).toEqual({ toolbar: false });
  });

  test('a local edit stays here once the namespace is unsynced', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    const reconciler = bindTo(store, view, local);

    view.store.update((draft) => AppSettings.setSynced(draft, NS, false, reconciler.local(), { freeze: true }));
    local.set({ toolbar: false });

    expect(store.shared[NS]).toEqual({ toolbar: true });
    expect(view.local[NS].keys).toEqual(['toolbar']);
  });

  test('a change from another device lands locally', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    bindTo(store, view, local);

    store.device().store.update((draft) => AppSettings.setValue(draft, NS, 'toolbar', false));

    expect(local.get()).toEqual({ toolbar: false });
  });

  test('an unsynced namespace ignores a change to a value it froze', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    const reconciler = bindTo(store, view, local);

    view.store.update((draft) => AppSettings.setSynced(draft, NS, false, reconciler.local(), { freeze: true }));
    store.device().store.update((draft) => AppSettings.setValue(draft, NS, 'toolbar', false));

    expect(local.get()).toEqual({ toolbar: true });
  });

  test('rejoining the account replaces this device’s values', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    const reconciler = bindTo(store, view, local);

    view.store.update((draft) => AppSettings.setSynced(draft, NS, false, reconciler.local(), { freeze: true }));
    local.set({ toolbar: false });
    view.store.update((draft) => AppSettings.setSynced(draft, NS, true, reconciler.local()));

    expect(local.get()).toEqual({ toolbar: true });
  });

  test('applying a remote change does not echo back as a local edit', () => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    bindTo(store, view, local);

    store.device().store.update((draft) => AppSettings.setValue(draft, NS, 'toolbar', false));
    expect(store.shared[NS]).toEqual({ toolbar: false });
    expect(view.local).toEqual({});
  });

  test('the plugin set rides the same reconciliation, keyed by plugin id', () => {
    const markdown = 'org.dxos.plugin.markdown';
    const chess = 'org.dxos.plugin.chess';
    const store = makeStore();
    const here = makeLocal({ [markdown]: true, [chess]: false }, AppSettings.PLUGINS_NAMESPACE);
    const there = makeLocal({ [markdown]: true, [chess]: false }, AppSettings.PLUGINS_NAMESPACE);
    bindTo(store, store.device(), here);
    bindTo(store, store.device(), there);

    // Enabling chess on the other device enables it here too.
    there.set({ [markdown]: true, [chess]: true });

    expect(AppSettings.getEnabledPlugins(here.get()).sort()).toEqual([chess, markdown]);
  });

  test('a device with its own plugin set still receives a plugin enabled elsewhere', () => {
    const markdown = 'org.dxos.plugin.markdown';
    const chess = 'org.dxos.plugin.chess';
    const sketch = 'org.dxos.plugin.sketch';
    const store = makeStore();
    const here = makeLocal({ [markdown]: true, [chess]: true }, AppSettings.PLUGINS_NAMESPACE);
    const there = makeLocal({ [markdown]: true, [chess]: true }, AppSettings.PLUGINS_NAMESPACE);
    const view = store.device();
    bindTo(store, view, here);
    bindTo(store, store.device(), there);

    // Soft fork: no freeze, so only what this device changes afterwards diverges.
    view.store.update((draft) => AppSettings.setSynced(draft, AppSettings.PLUGINS_NAMESPACE, false, here.get()));
    here.set({ [markdown]: true, [chess]: false });
    there.set({ [markdown]: true, [chess]: true, [sketch]: true });

    expect(AppSettings.getEnabledPlugins(here.get()).sort()).toEqual([markdown, sketch]);
    expect(AppSettings.getEnabledPlugins(there.get()).sort()).toEqual([chess, markdown, sketch]);
  });
});
