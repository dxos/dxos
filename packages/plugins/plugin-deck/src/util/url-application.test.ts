//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { makeUrlApplication } from './url-application';

const DeckState = Schema.Struct({ workspace: Schema.String, planks: Schema.Array(Schema.String) });
type DeckState = typeof DeckState.Type;

const DEFAULT: DeckState = { workspace: 'default', planks: [] };

/** A store that survives across registries, so a test can start from a previous session's deck. */
const makeStore = (persisted?: DeckState) => {
  const entries = new Map(persisted ? [['deck', JSON.stringify(persisted)]] : []);
  return KeyValueStore.makeStringOnly({
    get: (key) => Effect.succeed(entries.get(key)),
    set: (key, value) => Effect.sync(() => void entries.set(key, value)),
    remove: (key) => Effect.sync(() => void entries.delete(key)),
    clear: Effect.sync(() => entries.clear()),
    size: Effect.sync(() => entries.size),
  });
};

const makeStateAtom = (persisted?: DeckState) =>
  Atom.kvs({
    runtime: Atom.runtime(Layer.succeed(KeyValueStore.KeyValueStore)(makeStore(persisted))),
    key: 'deck',
    schema: DeckState,
    defaultValue: () => DEFAULT,
  }).pipe(Atom.keepAlive);

/** The url-handler wiring: a persisted deck atom, the change subscription, and the outbound URL write. */
const setup = (persisted?: DeckState) => {
  const registry = AtomRegistry.make();
  const stateAtom = makeStateAtom(persisted);
  const urlApplication = makeUrlApplication(registry.get(stateAtom));
  const urlWrites: string[] = [];
  registry.subscribe(stateAtom, (state) => {
    if (urlApplication.observe(state)) {
      urlWrites.push(['', 'w', state.workspace, ...state.planks].join('/'));
    }
  });
  return { registry, stateAtom, urlApplication, urlWrites };
};

/** The shape of a URL restore: switch the workspace, wait for the URL's nodes, then set its planks. */
const restore = (harness: ReturnType<typeof setup>, waiting: Effect.Effect<void>) => {
  const { registry, stateAtom, urlApplication } = harness;
  return Effect.gen(function* () {
    const application = urlApplication.begin();
    yield* urlApplication.applying(Effect.sync(() => registry.set(stateAtom, { workspace: 'space', planks: [] })));
    yield* waiting;
    if (application.superseded()) {
      return 'superseded' as const;
    }
    yield* urlApplication.applying(
      Effect.sync(() => registry.set(stateAtom, { workspace: 'space', planks: ['doc-a', 'doc-b'] })),
    );
    return 'applied' as const;
  });
};

describe('url application', () => {
  test('a storage-backed atom notifies its subscribers on its first read', ({ expect }) => {
    const registry = AtomRegistry.make();
    const stateAtom = makeStateAtom();
    let notifications = 0;
    registry.subscribe(stateAtom, () => {
      notifications += 1;
    });
    registry.get(stateAtom);
    // Pins the behavior the seeding below defends against; an async backing store would break it.
    expect(notifications).toBe(1);
  });

  test("a returning user's persisted deck is not a deck change", ({ expect }) => {
    const { urlWrites } = setup({ workspace: 'space', planks: ['doc-a'] });
    expect(urlWrites).toEqual([]);
  });

  test("an application's own writes neither supersede it nor drive the URL", ({ expect }) => {
    const harness = setup();
    const outcome = Effect.runSync(restore(harness, Effect.void));
    expect(outcome).toBe('applied');
    expect(harness.urlWrites).toEqual([]);
    expect(harness.registry.get(harness.stateAtom).planks).toEqual(['doc-a', 'doc-b']);
  });

  test('a navigation while the application waits supersedes it and drives the URL', ({ expect }) => {
    const harness = setup();
    const navigate = Effect.sync(() =>
      harness.registry.set(harness.stateAtom, { workspace: 'other', planks: ['doc-c'] }),
    );
    const outcome = Effect.runSync(restore(harness, navigate));
    expect(outcome).toBe('superseded');
    expect(harness.urlWrites).toEqual(['/w/other/doc-c']);
    expect(harness.registry.get(harness.stateAtom).planks).toEqual(['doc-c']);
  });

  test('a newer URL supersedes the one being applied', ({ expect }) => {
    const harness = setup();
    // A Back press lands while the cold restore is still waiting on its nodes.
    const outcome = Effect.runSync(
      restore(
        harness,
        Effect.sync(() => harness.urlApplication.begin()),
      ),
    );
    expect(outcome).toBe('superseded');
    expect(harness.registry.get(harness.stateAtom).planks).toEqual([]);
  });

  test('attribution ends when an application fails', ({ expect }) => {
    const harness = setup();
    Effect.runSync(
      harness.urlApplication.applying(Effect.fail('resolution failed')).pipe(Effect.catch(() => Effect.void)),
    );
    harness.registry.set(harness.stateAtom, { workspace: 'other', planks: ['doc-c'] });
    expect(harness.urlWrites).toEqual(['/w/other/doc-c']);
  });
});
