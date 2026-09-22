//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSettings from '@dxos/app-toolkit/AppSettings';

import { Reconciler, type Store } from './reconciler.ts';

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
const makeLocal = (
  initial: AppSettings.Values,
  { namespace = NS, sparse }: { namespace?: string; sparse?: boolean } = {},
) => {
  let value = initial;
  let failNextWrite = false;
  const listeners: (() => void)[] = [];
  const put = (next: AppSettings.Values) => {
    value = next;
    listeners.forEach((listener) => listener());
  };

  return {
    get: () => value,
    set: put,
    /** Make the next write throw, as a binding whose persistence is momentarily unavailable does. */
    failOnce: () => {
      failNextWrite = true;
    },
    binding: {
      namespace,
      sparse,
      read: () => value,
      write: async (next: AppSettings.Values) => {
        if (failNextWrite) {
          failNextWrite = false;
          throw new Error('write failed');
        }
        put(next);
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

/** Let every reconciliation in flight land, and any it deferred replay. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('Reconciler', () => {
  test('seeding adopts settings this device already had', async ({ expect }) => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true, folding: false });
    const view = store.device();
    bindTo(store, view, local);
    await flush();

    expect(store.shared[NS]).toEqual({ toolbar: true, folding: false });
  });

  test('seeding prefers the account over the joining device', async ({ expect }) => {
    const store = makeStore();
    store.shared[NS] = { toolbar: false };
    const local = makeLocal({ toolbar: true, folding: true });
    const view = store.device();
    bindTo(store, view, local);
    await flush();

    expect(local.get()).toEqual({ toolbar: false, folding: true });
    expect(store.shared[NS]).toEqual({ toolbar: false, folding: true });
  });

  test('a local edit reaches the shared layer', async ({ expect }) => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    bindTo(store, view, local);
    await flush();

    local.set({ toolbar: false });
    await flush();

    expect(store.shared[NS]).toEqual({ toolbar: false });
  });

  test('a local edit stays here once the namespace is unsynced', async ({ expect }) => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    const reconciler = bindTo(store, view, local);
    await flush();

    view.store.update((draft) => AppSettings.takeLocal(draft, NS, reconciler.local(), { freeze: true }));
    await flush();
    local.set({ toolbar: false });
    await flush();

    expect(store.shared[NS]).toEqual({ toolbar: true });
    expect(view.local[NS].keys).toEqual(['toolbar']);
  });

  test('a change from another device lands locally', async ({ expect }) => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    bindTo(store, view, local);
    await flush();

    store.device().store.update((draft) => AppSettings.setValue(draft, NS, 'toolbar', false));
    await flush();

    expect(local.get()).toEqual({ toolbar: false });
  });

  test('an unsynced namespace ignores a change to a value it froze', async ({ expect }) => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    const reconciler = bindTo(store, view, local);
    await flush();

    view.store.update((draft) => AppSettings.takeLocal(draft, NS, reconciler.local(), { freeze: true }));
    await flush();
    store.device().store.update((draft) => AppSettings.setValue(draft, NS, 'toolbar', false));
    await flush();

    expect(local.get()).toEqual({ toolbar: true });
  });

  test('rejoining the account replaces this device’s values', async ({ expect }) => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    const reconciler = bindTo(store, view, local);
    await flush();

    view.store.update((draft) => AppSettings.takeLocal(draft, NS, reconciler.local(), { freeze: true }));
    await flush();
    local.set({ toolbar: false });
    await flush();
    view.store.update((draft) => AppSettings.rejoinAccount(draft, NS, reconciler.local()));
    await flush();

    expect(local.get()).toEqual({ toolbar: true });
  });

  test('a failed write leaves the baseline, so the next pull retries', async ({ expect }) => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    const reconciler = new Reconciler(view.store, local.binding);
    reconciler.seed();
    await flush();

    local.failOnce();
    store.device().store.update((draft) => AppSettings.setValue(draft, NS, 'toolbar', false));
    await flush();
    expect(local.get()).toEqual({ toolbar: true });

    reconciler.pull();
    await flush();
    expect(local.get()).toEqual({ toolbar: true });

    // Recording agreement before the write landed would leave this one with nothing left to do.
    reconciler.pull();
    await flush();
    expect(local.get()).toEqual({ toolbar: false });
  });

  test('applying a remote change does not echo back as a local edit', async ({ expect }) => {
    const store = makeStore();
    const local = makeLocal({ toolbar: true });
    const view = store.device();
    bindTo(store, view, local);
    await flush();

    store.device().store.update((draft) => AppSettings.setValue(draft, NS, 'toolbar', false));
    await flush();
    expect(store.shared[NS]).toEqual({ toolbar: false });
    expect(view.local).toEqual({});
  });

  test('the plugin set rides the same reconciliation, keyed by plugin id', async ({ expect }) => {
    const markdown = 'org.dxos.plugin.markdown';
    const chess = 'org.dxos.plugin.chess';
    const store = makeStore();
    const here = makeLocal({ [markdown]: true, [chess]: false }, { namespace: AppSettings.PLUGINS_NAMESPACE });
    const there = makeLocal({ [markdown]: true, [chess]: false }, { namespace: AppSettings.PLUGINS_NAMESPACE });
    bindTo(store, store.device(), here);
    await flush();
    bindTo(store, store.device(), there);
    await flush();

    // Enabling chess on the other device enables it here too.
    there.set({ [markdown]: true, [chess]: true });
    await flush();

    expect(AppSettings.getEnabledPlugins(here.get()).sort()).toEqual([chess, markdown]);
  });

  test('a plugin registered only on another device keeps its decision', async ({ expect }) => {
    const markdown = 'org.dxos.plugin.markdown';
    const chess = 'org.dxos.plugin.chess';
    const store = makeStore();
    // The plugin set is sparse: this device has never heard of chess, so it reports no key for it.
    const here = makeLocal({ [markdown]: true }, { namespace: AppSettings.PLUGINS_NAMESPACE, sparse: true });
    const there = makeLocal(
      { [markdown]: true, [chess]: true },
      { namespace: AppSettings.PLUGINS_NAMESPACE, sparse: true },
    );
    bindTo(store, store.device(), there);
    await flush();
    bindTo(store, store.device(), here);
    await flush();

    // An unrelated edit here must not read chess's absence as a decision to uninstall it.
    here.set({ [markdown]: false });
    await flush();

    expect(store.shared[AppSettings.PLUGINS_NAMESPACE]).toEqual({ [markdown]: false, [chess]: true });
  });

  test('a device with its own plugin set still receives a plugin enabled elsewhere', async ({ expect }) => {
    const markdown = 'org.dxos.plugin.markdown';
    const chess = 'org.dxos.plugin.chess';
    const sketch = 'org.dxos.plugin.sketch';
    const store = makeStore();
    const here = makeLocal({ [markdown]: true, [chess]: true }, { namespace: AppSettings.PLUGINS_NAMESPACE });
    const there = makeLocal({ [markdown]: true, [chess]: true }, { namespace: AppSettings.PLUGINS_NAMESPACE });
    const view = store.device();
    bindTo(store, view, here);
    await flush();
    bindTo(store, store.device(), there);
    await flush();

    // Soft fork: no freeze, so only what this device changes afterwards diverges.
    view.store.update((draft) => AppSettings.takeLocal(draft, AppSettings.PLUGINS_NAMESPACE, here.get()));
    await flush();
    here.set({ [markdown]: true, [chess]: false });
    await flush();
    there.set({ [markdown]: true, [chess]: true, [sketch]: true });
    await flush();

    expect(AppSettings.getEnabledPlugins(here.get()).sort()).toEqual([markdown, sketch]);
    expect(AppSettings.getEnabledPlugins(there.get()).sort()).toEqual([chess, markdown, sketch]);
  });

  test('a local notification arriving before the write lands does not republish the pre-write value', async ({
    expect,
  }) => {
    const stack = 'org.dxos.plugin.stack';
    const shared: AppSettings.Namespaces = { [NS]: { [stack]: false } };
    const local = AppSettings.makeDeviceSettings();
    const store: Store = {
      read: () => ({ shared, local }),
      update: (fn) => fn({ shared, local }),
    };

    let value: AppSettings.Values = { [stack]: false };
    const reconciler = new Reconciler(store, {
      namespace: NS,
      sparse: true,
      read: () => value,
      write: (next) =>
        Promise.resolve().then(() => {
          value = { ...next };
        }),
    });

    shared[NS][stack] = true;
    reconciler.pull();
    await flush();
    reconciler.push();
    await flush();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(shared[NS][stack]).toBe(true);
  });

  test('a push does not adopt a shared value it has not put into effect', async ({ expect }) => {
    const stack = 'org.dxos.plugin.stack';
    const shared: AppSettings.Namespaces = { [NS]: { [stack]: false } };
    const local = AppSettings.makeDeviceSettings();
    const store: Store = {
      read: () => ({ shared, local }),
      update: (fn) => fn({ shared, local }),
    };

    let value: AppSettings.Values = { [stack]: false };
    const reconciler = new Reconciler(store, {
      namespace: NS,
      sparse: true,
      read: () => value,
      write: async (next) => {
        value = { ...next };
      },
    });

    shared[NS][stack] = true;
    value = { ...value, 'org.dxos.plugin.other': false };
    reconciler.push();
    await flush();

    reconciler.pull();
    await flush();
    expect(value[stack]).toBe(true);

    value = { ...value, 'org.dxos.plugin.third': false };
    reconciler.push();
    await flush();
    expect(shared[NS][stack]).toBe(true);
  });
});
