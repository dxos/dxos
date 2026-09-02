//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Annotation, Collection, Database, type Feed, Obj, Ref, Tag, type Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { Tagging } from '@dxos/schema';

import * as AppAnnotation from '../echo/AppAnnotation';

/**
 * Raised when a sample space cannot be built — a missing space root, an unresolvable tag, or a
 * phase whose prerequisites were not met.
 */
export class SampleSpaceError extends BaseError.extend('SampleSpaceError', 'Sample space build failed') {}

//
// Clock
//
// Sample content is authored relative to a fixed reference date rather than the wall clock, so a
// rebuild produces the same timestamps and the committed snapshot's diff stays legible.
//

export class Clock extends Context.Service<
  Clock,
  {
    /** The reference date every offset is measured from. */
    readonly now: Date;
    /** ISO timestamp `days` before the reference date, at `hours` UTC. */
    readonly daysAgo: (days: number, hours?: number) => string;
    /** ISO timestamp `days` after the reference date, at `hours` UTC. */
    readonly daysFromNow: (days: number, hours?: number) => string;
  }
>()('@dxos/app-toolkit/SampleSpace/Clock') {}

export const makeClock = (reference: Date | string): Clock['Service'] => {
  const now = typeof reference === 'string' ? new Date(reference) : reference;
  const daysAgo = (days: number, hours = 9): string => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - days);
    date.setUTCHours(hours, 0, 0, 0);
    return date.toISOString();
  };

  return { now, daysAgo, daysFromNow: (days, hours) => daysAgo(-days, hours) };
};

/** ISO timestamp `days` before the sample space's reference date. */
export const daysAgo = (days: number, hours?: number): Effect.Effect<string, never, Clock> =>
  Effect.map(Clock, ({ daysAgo }) => daysAgo(days, hours));

/** ISO timestamp `days` after the sample space's reference date. */
export const daysFromNow = (days: number, hours?: number): Effect.Effect<string, never, Clock> =>
  Effect.map(Clock, ({ daysFromNow }) => daysFromNow(days, hours));

//
// Feeds
//
// Feed entities only get DXNs once the database has flushed, so appends cannot run inline with the
// phase that authors them. Phases enqueue instead and the runner drains after the final flush,
// which makes the ordering structural rather than a comment a later edit can miss.
//

export class Feeds extends Context.Service<
  Feeds,
  {
    /** Queue `items` for append to `feed` once the database has flushed. */
    readonly append: (feed: Feed.Feed, items: Obj.Unknown[]) => Effect.Effect<void>;
    /** Flush, then append every queued batch in enqueue order. Called by the runner. */
    readonly drain: Effect.Effect<void, never, Database.Service>;
  }
>()('@dxos/app-toolkit/SampleSpace/Feeds') {}

export const makeFeeds = (): Feeds['Service'] => {
  const queue: Array<{ feed: Feed.Feed; items: Obj.Unknown[] }> = [];

  return {
    append: (feed, items) =>
      Effect.sync(() => {
        queue.push({ feed, items });
      }),
    drain: Effect.gen(function* () {
      yield* Database.flush();
      for (const { feed, items } of queue) {
        yield* Database.appendToFeed(feed, items);
      }
      queue.length = 0;
    }),
  };
};

/** Queue `items` for append to `feed` after the build's final flush. */
export const appendToFeed = (feed: Feed.Feed, items: Obj.Unknown[]): Effect.Effect<void, never, Feeds> =>
  Effect.flatMap(Feeds, ({ append }) => append(feed, items));

//
// Root collection
//

export class Root extends Context.Service<
  Root,
  {
    /** The space's root collection, created and annotated onto `SpaceProperties` on first access. */
    readonly get: Effect.Effect<Collection.Collection, SampleSpaceError, Database.Service>;
  }
>()('@dxos/app-toolkit/SampleSpace/Root') {}

/**
 * Root collection bound to a space's `SpaceProperties`. Seeds the collection and its annotation when
 * absent, which a headless build always needs — that is normally plugin-space's identity-created
 * capability, and no plugin runs here.
 */
export const makeRoot = (properties: Obj.Any): Root['Service'] => {
  let cached: Collection.Collection | undefined;

  return {
    get: Effect.gen(function* () {
      if (cached) {
        return cached;
      }
      if (Option.isNone(Annotation.get(properties, AppAnnotation.RootCollectionAnnotation))) {
        const collection = yield* Database.add(Collection.make());
        Obj.update(properties, (properties) => {
          Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(collection));
        });
      }
      const root = Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(
        Option.map((ref) => ref.target),
        Option.getOrUndefined,
      );
      if (!root) {
        return yield* Effect.fail(new SampleSpaceError({ context: { reason: 'root-collection-unresolved' } }));
      }
      cached = root;
      return root;
    }),
  };
};

/**
 * Adds a named collection holding `objects` and appends it to the space root.
 *
 * The root only ever holds collections, so every collection-item object (documents, sketches,
 * sheets) belongs to a themed collection rather than sitting loose on the root.
 */
export const collection: (
  name: string,
  objects: Ref.Ref<Obj.Unknown>[],
) => Effect.Effect<Collection.Collection, SampleSpaceError, Database.Service | Root> = Effect.fnUntraced(function* (
  name: string,
  objects: Ref.Ref<Obj.Unknown>[],
) {
  const added = yield* Database.add(Obj.make(Collection.Collection, { name, objects }));
  const root = yield* Effect.flatMap(Root, ({ get }) => get);
  Obj.update(root, (root) => {
    root.objects.push(Ref.make(added));
  });
  return added;
});

//
// Tags
//

/** Structural shape of the tag index `Tagging` writes membership into. */
export type TagIndexOption = NonNullable<Parameters<typeof Tagging.setBatch>[1]>['index'];

export class Tags extends Context.Service<
  Tags,
  {
    /**
     * Space-relative URI of the tag `key`, resolved once per key. `resolve` creates the tag when the
     * key is not a plain label (system tags carry a canonical origin).
     */
    readonly uri: (
      key: string,
      resolve?: (db: Database.Database) => Promise<Type.InstanceType<typeof Tag.Tag>>,
    ) => Effect.Effect<string, never, Database.Service>;
  }
>()('@dxos/app-toolkit/SampleSpace/Tags') {}

/**
 * Tag URIs resolved once per key and cached. `Tag.findOrCreate` without a foreign key scans every
 * Tag in the space, so resolving per tagged object turns tagging into the dominant cost of a large
 * import. URIs are stored space-relative so membership survives the space-id remap on import —
 * the runtime resolves the same tags space-absolute, but `TagIndex` compares by entity id.
 */
export const makeTags = (): Tags['Service'] => {
  const cache = new Map<string, string>();

  return {
    uri: (key, resolve) =>
      Effect.gen(function* () {
        const cached = cache.get(key);
        if (cached) {
          return cached;
        }
        const { db } = yield* Database.Service;
        const tag = yield* Effect.promise(() => resolve?.(db) ?? Tag.findOrCreate(db, { label: key }));
        const uri = Obj.getURI(tag, { prefer: 'relative' }).toString();
        cache.set(key, uri);
        return uri;
      }),
  };
};

export type TagOptions = {
  readonly index?: TagIndexOption;
  /** Resolves a tag key to its object when it is not a plain label — system tags carry an origin. */
  readonly resolve?: (db: Database.Database, key: string) => Promise<Type.InstanceType<typeof Tag.Tag>>;
};

/**
 * Applies many (object, tag key) pairs at once, resolving each distinct key once.
 *
 * One `Tagging.setBatch` for the whole set: on the index path that is a single Automerge change and
 * one reactive notification, where a call per key would be one of each per key.
 */
export const tagBatch = Effect.fnUntraced(function* (
  entries: ReadonlyArray<{ readonly object: Obj.Any; readonly key: string }>,
  options: TagOptions = {},
) {
  if (entries.length === 0) {
    return;
  }
  const { uri } = yield* Tags;
  const { resolve } = options;
  const uris = new Map<string, string>();
  for (const key of new Set(entries.map((entry) => entry.key))) {
    uris.set(key, yield* uri(key, resolve && ((db) => resolve(db, key))));
  }

  const tagged: Array<{ object: Obj.Any; tagId: string }> = [];
  for (const { object, key } of entries) {
    const tagId = uris.get(key);
    if (tagId === undefined) {
      return yield* Effect.fail(new SampleSpaceError({ context: { reason: 'tag-unresolved', key } }));
    }
    tagged.push({ object, tagId });
  }
  Tagging.setBatch(tagged, { index: options.index });
});

/** Tags every object in `objects` with `key`, recording membership in `index` when one is given. */
export const tag = (objects: Obj.Any[], key: string, options: TagOptions = {}) =>
  tagBatch(
    objects.map((object) => ({ object, key })),
    options,
  );

//
// Membership
//

/**
 * Adds `items` to the database as children of `parent` and hands `attach` their refs so the caller
 * writes them into whichever membership array holds them. Membership and order are that array; the
 * parent edge rides along for the deletion cascade.
 */
export const children: <P extends Obj.Any, T extends Obj.Any>(
  parent: P,
  items: T[],
  attach: (parent: Obj.Mutable<P>, refs: Ref.Ref<T>[]) => void,
) => Effect.Effect<T[], SampleSpaceError, Database.Service> = Effect.fnUntraced(function* <
  P extends Obj.Any,
  T extends Obj.Any,
>(parent: P, items: T[], attach: (parent: Obj.Mutable<P>, refs: Ref.Ref<T>[]) => void) {
  for (const item of items) {
    // Widened so `Database.add` resolves its type-entity rejection against a concrete type.
    const entity: Obj.Any = item;
    yield* Database.add(entity);
  }
  // Membership is written before the parent edges: `Obj.setParent` warns for a parent that does not
  // yet reference the child, which would be one warning per item on every build.
  Obj.update(parent, (parent) => attach(parent, items.map(Ref.make)));
  for (const item of items) {
    Obj.setParent(item, parent);
  }
  return items;
});

//
// Seeds
//
// Sample content is authored as a table of seed rows keyed by a short discriminant, so later phases
// reference an entity by key (`people.kai`) rather than by index into an anonymous array.
//

export type Seed<Key extends string, Props> = Props & { readonly key: Key };

/** Materializes a seed table into a record keyed by each row's `key`. */
export const seed = Effect.fnUntraced(function* <Key extends string, Props, T, R>(
  seeds: ReadonlyArray<Seed<Key, Props>>,
  make: (seed: Seed<Key, Props>) => Effect.Effect<T, SampleSpaceError, R>,
) {
  const entries: Array<[Key, T]> = [];
  for (const row of seeds) {
    entries.push([row.key, yield* make(row)]);
  }
  return Object.fromEntries(entries) as Record<Key, T>;
});

//
// Phases
//

/** Services every phase can rely on, whether it runs headless or against a live space. */
export type Services = Database.Service | Clock | Feeds | Root | Tags;

/**
 * A named, reusable unit of sample content. Phases declare the schemas their objects need so a
 * space's type registration is derived from its phase list rather than hand-maintained alongside it.
 */
export interface Phase<A, In = void> {
  readonly name: string;
  readonly schemas: ReadonlyArray<Type.AnyEntity>;
  readonly run: (input: In) => Effect.Effect<A, SampleSpaceError, Services>;
}

/** Defines a phase. `In` is whatever earlier phases produced that this one needs. */
export const phase = <A, In = void>(
  name: string,
  options: {
    readonly schemas?: ReadonlyArray<Type.AnyEntity>;
    readonly run: (input: In) => Effect.Effect<A, SampleSpaceError, Services>;
  },
): Phase<A, In> => ({ name, schemas: options.schemas ?? [], run: options.run });

export type PhaseMap = Record<string, Phase<any, any>>;

/** The `run` functions of a phase map, as handed to a definition's `build`. */
export type PhaseRunners<Phases extends PhaseMap> = { readonly [K in keyof Phases]: Phases[K]['run'] };

export type SpaceOptions = {
  readonly name: string;
  readonly icon?: string;
  readonly hue?: string;
};

/**
 * Types the builder itself persists, registered for every definition — the root collection and the
 * themed collections `collection` files content under.
 */
export const BASE_SCHEMAS: ReadonlyArray<Type.AnyEntity> = [Collection.Collection];

export interface Definition<Phases extends PhaseMap, A> {
  readonly space: SpaceOptions;
  readonly reference: Date | string;
  readonly phases: Phases;
  /** Every schema declared by the definition's phases, deduplicated. */
  readonly schemas: ReadonlyArray<Type.AnyEntity>;
  readonly build: (phases: PhaseRunners<Phases>) => Effect.Effect<A, SampleSpaceError, Services>;
}

/**
 * Defines a sample space: which space to create, the reference date its content is authored
 * against, the phases it draws on, and the recipe that threads them together.
 *
 * The phase map is the single source of truth — `schemas` is derived from it, and `build` receives
 * the same phases as runners, so a phase cannot contribute content without its types registered.
 */
export const make = <Phases extends PhaseMap, A>(definition: {
  readonly space: SpaceOptions;
  readonly reference?: Date | string;
  readonly phases: Phases;
  readonly build: (phases: PhaseRunners<Phases>) => Effect.Effect<A, SampleSpaceError, Services>;
}): Definition<Phases, A> => ({
  space: definition.space,
  reference: definition.reference ?? new Date(),
  phases: definition.phases,
  schemas: [...new Set([...BASE_SCHEMAS, ...Object.values(definition.phases).flatMap((phase) => phase.schemas)])],
  build: definition.build,
});

//
// Runner
//

/** Layer providing every sample-space service for a space's properties and reference date. */
export const layer = (options: {
  readonly properties: Obj.Any;
  readonly reference: Date | string;
}): Layer.Layer<Clock | Feeds | Root | Tags> =>
  Layer.mergeAll(
    Layer.succeed(Clock, makeClock(options.reference)),
    Layer.sync(Feeds, makeFeeds),
    Layer.sync(Root, () => makeRoot(options.properties)),
    Layer.sync(Tags, makeTags),
  );

/**
 * Runs a definition's recipe against an existing space, then drains queued feed appends and
 * flushes. The same definition runs headless (into an exported archive) or against a live space,
 * which is what lets a sample space double as a debug-plugin preset.
 */
export const applyTo = <Phases extends PhaseMap, A>(
  definition: Definition<Phases, A>,
  space: { readonly db: Database.Database; readonly properties: Obj.Any },
): Effect.Effect<A, SampleSpaceError> => {
  const runners = Object.fromEntries(
    Object.entries(definition.phases).map(([name, phase]) => [name, phase.run]),
  ) as PhaseRunners<Phases>;

  return Effect.gen(function* () {
    const result = yield* definition.build(runners);
    yield* Effect.flatMap(Feeds, ({ drain }) => drain);
    yield* Database.flush();
    return result;
  }).pipe(
    Effect.provide(layer({ properties: space.properties, reference: definition.reference })),
    Effect.provide(Database.layer(space.db)),
  );
};
