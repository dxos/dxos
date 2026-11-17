//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Spec from '@dxos/compute/Spec';
import { type Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';

import * as Feature from './Feature.ts';
import * as FeatureEmbed from './FeatureEmbed.ts';
import * as FeatureMap from './FeatureMap.ts';
import * as FeatureSpec from './FeatureSpec.ts';

/**
 * A spec's text is canonical for which features the spec holds and in what order: each is an embed of the feature
 * object. The spec's {@link FeatureMap.FeaturesAnnotation} is the same list held as refs, for queries, the canvas and
 * ECHO ownership, and only {@link sync} writes it from the text.
 */

const isId = Schema.is(Obj.ID);

/** The spec's text. */
export const read = async (spec: Spec.Spec): Promise<string> => {
  const content = await loadContent(spec);
  return content?.content ?? '';
};

/** Applies the changes `edit` computes from the spec's current text, as a minimal delta. */
export const edit = async (spec: Spec.Spec, edit: (text: string) => readonly FeatureEmbed.Change[]): Promise<void> => {
  const content = await loadContent(spec);
  if (!content) {
    return;
  }
  const text = content.content ?? '';
  const changes = edit(text);
  if (changes.length > 0) {
    Doc.updateText(content, 'content', FeatureEmbed.apply(text, changes));
  }
};

/** Whether the spec's text embeds the object. */
export const embeds = async (spec: Spec.Spec, id: string): Promise<boolean> =>
  FeatureEmbed.parse(await read(spec)).some((embed) => embed.id === id);

/** Embeds the feature at the end of the spec's features, unless the text embeds it already. */
export const embed = (spec: Spec.Spec, feature: Feature.Feature): Promise<void> =>
  edit(spec, (text) =>
    FeatureEmbed.parse(text).some((embed) => embed.id === feature.id)
      ? []
      : [FeatureEmbed.append(text, makeEmbed(feature))],
  );

/** Takes every embed of the feature out of the spec's text. */
export const unembed = (spec: Spec.Spec, id: string): Promise<void> =>
  edit(spec, (text) => FeatureEmbed.remove(text, id));

/** Rewrites the labels of the feature's embeds to its name. */
export const relabel = (spec: Spec.Spec, feature: Feature.Feature): Promise<void> =>
  edit(spec, (text) => FeatureEmbed.relabel(text, feature.id, feature.name));

/** Replaces the `feat` block at `block` with the feature's embed, or embeds it at the end when the block is gone. */
export const replaceBlock = (spec: Spec.Spec, feature: Feature.Feature, block: string | undefined): Promise<void> =>
  edit(spec, (text) => {
    if (FeatureEmbed.parse(text).some((embed) => embed.id === feature.id)) {
      return [];
    }
    // Older documents may group blocks in one fence, which parse reads only when each has its own.
    const split = FeatureSpec.split(text);
    const found = block === undefined ? undefined : FeatureSpec.parse(split).find(({ id }) => id === block);
    const next = FeatureEmbed.apply(split, [
      found
        ? { from: found.from, to: found.to, insert: makeEmbed(feature) }
        : FeatureEmbed.append(split, makeEmbed(feature)),
    ]);
    return [{ from: 0, to: text.length, insert: next }];
  });

export const makeEmbed = (feature: Feature.Feature): string =>
  FeatureEmbed.make({ label: feature.name, uri: Obj.getURI(feature) });

export type SyncResult = {
  /** Features the text now holds that the spec did not: added, restored or moved in. */
  claimed: string[];
  /** Features the spec held that the text did not embed, embedded at the end of its features. */
  embedded: string[];
  /** Features whose embeds were removed, deleted since no other spec's text embeds them either. */
  deleted: string[];
};

export type SyncOptions = {
  /** Features whose embeds an edit was seen to remove; only these may leave the spec. */
  removed?: readonly string[];
};

/**
 * Makes the spec's features the ones its text embeds, in its order. An embedded feature on no spec, deleted, or on
 * a spec whose document does not embed it is claimed, so cutting an embed from one text and pasting it into
 * another moves the feature; one its own spec's text embeds is a reference and stays there. A feature whose embed
 * was seen to go (`removed`) moves to another spec whose document embeds it, or is deleted, which an undo or a paste
 * reverses. A feature the spec holds that the text has never embedded, as one added by a seed or a migration, is
 * embedded rather than dropped.
 */
export const sync = async (spec: Spec.Spec, { removed = [] }: SyncOptions = {}): Promise<SyncResult> => {
  const db = Obj.getDatabase(spec);
  const result: SyncResult = { claimed: [], embedded: [], deleted: [] };
  if (!db) {
    return result;
  }

  const ids = [...new Set(FeatureEmbed.parse(await read(spec)).map(({ id }) => id))].filter(isId);
  const found = ids.length > 0 ? await loadIncludingDeleted(db, ids) : new Map<string, Obj.Unknown>();
  const owned: Feature.Feature[] = [];
  for (const id of ids) {
    const feature = found.get(id);
    if (!Feature.instanceOf(feature)) {
      continue;
    }
    const container = FeatureMap.getContainer(feature);
    if (container?.id === spec.id && !Obj.isDeleted(feature)) {
      owned.push(feature);
      continue;
    }
    if (container && container.id !== spec.id && !Obj.isDeleted(feature) && (await embeds(container, id))) {
      continue;
    }
    // A spec cannot hold the feature it breaks down, nor one above it.
    if (FeatureMap.isWithin(spec, feature)) {
      continue;
    }
    if (Obj.isDeleted(feature)) {
      db.add(feature);
    }
    if (container && container.id !== spec.id) {
      FeatureMap.detach(container, feature.id);
    }
    owned.push(feature);
    result.claimed.push(id);
  }

  const kept = new Set(owned.map(({ id }) => id));
  const gone = new Set(removed);
  for (const feature of await Ref.loadAll(FeatureMap.getFeatures(spec))) {
    if (kept.has(feature.id)) {
      continue;
    }
    if (!gone.has(feature.id)) {
      await embed(spec, feature);
      owned.push(feature);
      result.embedded.push(feature.id);
      continue;
    }
    FeatureMap.detach(spec, feature.id);
    const other = await findEmbedder(db, spec, feature.id);
    if (other) {
      FeatureMap.attach(other, feature);
    } else {
      db.remove(feature);
      result.deleted.push(feature.id);
    }
  }

  FeatureMap.setFeatures(spec, owned);
  await number(spec);
  return result;
};

/**
 * Gives each feature the spec holds a block id, the next `F-n` free in the spec, and each of its requirements an id
 * under that, so a feature made in the app is numbered as its `feat` block will be. Ids once given are kept, since
 * text and code cite them. The id names no file until {@link take} reads its block in from one.
 */
export const number = async (spec: Spec.Spec): Promise<void> => {
  const features = await Ref.loadAll(FeatureMap.getFeatures(spec));
  let next = nextBlockNumber([
    ...FeatureSpec.parse(await read(spec)).map(({ id }) => id),
    ...features.flatMap((feature) => Feature.getBlockId(feature) ?? []),
  ]);
  for (const feature of features) {
    const current = Feature.getBlockId(feature);
    const blockId = current ?? `F-${next++}`;
    const requirements = Feature.getRequirements(feature);
    const numbered = Feature.numberRequirements(blockId, requirements);
    const renumbered = numbered.some((requirement, index) => requirement.id !== requirements[index].id);
    if (!current || renumbered) {
      Obj.update(feature, (feature) => {
        if (!current) {
          Feature.setSources(feature, [...Feature.getSources(feature), FeatureSpec.getSource('', blockId)]);
        }
        // Only the ids, so the records and the cursors into their text stay.
        numbered.forEach(({ key, id }) => {
          const record = feature.requirements?.[key];
          if (record) {
            record.id = id;
          }
        });
      });
    }
  }
};

const nextBlockNumber = (ids: readonly string[]): number =>
  Math.max(0, ...ids.map((id) => Number(id.match(/^F-(\d+)$/)?.[1] ?? 0))) + 1;

const loadContent = (spec: Spec.Spec) => spec.content.tryLoad();

const loadIncludingDeleted = async (db: Database.Database, ids: string[]): Promise<Map<string, Obj.Unknown>> => {
  const objects = await db.query(Query.select(Filter.id(...ids)).options({ deleted: 'include' })).run();
  return new Map(objects.map((object) => [object.id, object]));
};

/** Another spec whose text embeds the object, if any. */
const findEmbedder = async (db: Database.Database, spec: Spec.Spec, id: string): Promise<Spec.Spec | undefined> => {
  const specs = await db.query(Filter.type(Spec.Spec)).run();
  for (const other of specs) {
    if (other.id !== spec.id && (await embeds(other, id))) {
      return other;
    }
  }
  return undefined;
};
