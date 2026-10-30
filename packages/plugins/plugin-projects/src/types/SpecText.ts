//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { SpecDocument } from '@dxos/types';

import * as Feature from './Feature.ts';
import * as FeatureEmbed from './FeatureEmbed.ts';
import * as FeatureSpec from './FeatureSpec.ts';
import type * as ProjectCapabilities from './ProjectCapabilities.ts';
import * as Spec from './Spec.ts';

/**
 * A spec's document is canonical for which features the spec holds and in what order: each is an embed of the feature
 * object. `Spec.features` is the same list held as refs, for queries, the canvas and ECHO ownership, and only
 * {@link sync} writes it from the text.
 */

const isId = Schema.is(Obj.ID);

/** The text of the spec's document. */
export const read = async (spec: Spec.Spec): Promise<string> => {
  const content = await loadContent(spec);
  return content?.content ?? '';
};

/** Applies the changes `edit` computes from the spec document's current text, as a minimal delta. */
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

/** Whether the spec's document embeds the object. */
export const embeds = async (spec: Spec.Spec, id: string): Promise<boolean> =>
  FeatureEmbed.parse(await read(spec)).some((embed) => embed.id === id);

/** Embeds the feature at the end of the spec's features, unless the document embeds it already. */
export const embed = (spec: Spec.Spec, feature: Feature.Feature): Promise<void> =>
  edit(spec, (text) =>
    FeatureEmbed.parse(text).some((embed) => embed.id === feature.id)
      ? []
      : [FeatureEmbed.append(text, makeEmbed(feature))],
  );

/** Takes every embed of the feature out of the spec's document. */
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
    const found = block === undefined ? undefined : FeatureSpec.parse(text).find(({ id }) => id === block);
    return found
      ? [{ from: found.from, to: found.to, insert: makeEmbed(feature) }]
      : [FeatureEmbed.append(text, makeEmbed(feature))];
  });

export const makeEmbed = (feature: Feature.Feature): string =>
  FeatureEmbed.make({ label: feature.name, uri: Obj.getURI(feature) });

export type SyncResult = {
  /** Features the document now holds that the spec did not: added, restored or moved in. */
  claimed: string[];
  /** Features the spec held that the document did not embed, embedded at the end of its features. */
  embedded: string[];
  /** Features whose embeds were removed, deleted since no other spec's document embeds them either. */
  deleted: string[];
};

export type SyncOptions = {
  /** Features whose embeds an edit was seen to remove; only these may leave the spec. */
  removed?: readonly string[];
};

/**
 * Makes `Spec.features` the features the document embeds, in its order. An embedded feature on no spec, deleted, or on
 * a spec whose document does not embed it is claimed, so cutting an embed from one document and pasting it into
 * another moves the feature; one its own spec's document embeds is a reference and stays there. A feature whose embed
 * was seen to go (`removed`) moves to another spec whose document embeds it, or is deleted, which an undo or a paste
 * reverses. A feature the spec holds that the document has never embedded, as one added by a seed or a migration, is
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
    const container = Spec.getContainer(feature);
    if (container?.id === spec.id && !Obj.isDeleted(feature)) {
      owned.push(feature);
      continue;
    }
    if (container && container.id !== spec.id && !Obj.isDeleted(feature) && (await embeds(container, id))) {
      continue;
    }
    // A spec cannot hold the feature it breaks down, nor one above it.
    if (Spec.isWithin(spec, feature)) {
      continue;
    }
    if (Obj.isDeleted(feature)) {
      db.add(feature);
    }
    if (container && container.id !== spec.id) {
      detach(container, feature.id);
    }
    owned.push(feature);
    result.claimed.push(id);
  }

  const kept = new Set(owned.map(({ id }) => id));
  const gone = new Set(removed);
  for (const feature of await Ref.loadAll(spec.features)) {
    if (kept.has(feature.id)) {
      continue;
    }
    if (!gone.has(feature.id)) {
      await embed(spec, feature);
      owned.push(feature);
      result.embedded.push(feature.id);
      continue;
    }
    detach(spec, feature.id);
    const other = await findEmbedder(db, spec, feature.id);
    if (other) {
      Obj.update(other, (other) => {
        other.features.push(Ref.make(feature));
      });
    } else {
      db.remove(feature);
      result.deleted.push(feature.id);
    }
  }

  const current = spec.features.map((ref) => FeatureEmbed.entityId(ref.uri));
  if (current.length !== owned.length || owned.some((feature, index) => feature.id !== current[index])) {
    Obj.update(spec, (spec) => {
      spec.features.splice(0, spec.features.length, ...owned.map((feature) => Ref.make(feature)));
    });
  }
  return result;
};

export type ExpandOptions = {
  /** The file text last written out or read in; a block it holds for a feature is updated in place, keeping its form. */
  base?: string;
};

/**
 * The spec file's text with each embed of a feature the spec holds written out as its `feat` block. A feature read in
 * from a block keeps that block's id; others take the next `F-n` free in the text. An embed of another spec's feature
 * is a reference and stays an embed.
 */
export const expand = async (spec: Spec.Spec, { base }: ExpandOptions = {}): Promise<string> => {
  const text = await read(spec);
  const owned = new Map((await Ref.loadAll(spec.features)).map((feature) => [feature.id, feature]));
  const blocks = new Map(base === undefined ? [] : FeatureSpec.parse(base).map((block) => [block.id, block]));
  const used = new Set([
    ...FeatureSpec.parse(text).map(({ id }) => id),
    ...blocks.keys(),
    ...[...owned.values()].flatMap((feature) => Feature.getBlockId(feature) ?? []),
  ]);
  let next = Math.max(0, ...[...used].map((id) => Number(id.match(/^F-(\d+)$/)?.[1] ?? 0))) + 1;
  const changes = FeatureEmbed.parse(text).flatMap(({ id, from, to }): FeatureEmbed.Change[] => {
    const feature = owned.get(id);
    if (!feature) {
      return [];
    }
    owned.delete(id);
    const blockId = Feature.getBlockId(feature) ?? `F-${next++}`;
    const block = base !== undefined ? blocks.get(blockId) : undefined;
    const insert =
      base !== undefined && block
        ? FeatureSpec.update(base.slice(block.from, block.to), feature)
        : FeatureSpec.print(blockId, feature);
    return [{ from, to, insert }];
  });
  return FeatureEmbed.apply(text, changes);
};

export type TakeOptions = {
  /** The file's path in its repository, which a feature records as where it was read in from. */
  path: string;
  text: string;
};

export type TakeResult = { created: string[]; updated: string[] };

/**
 * Takes a spec file's text into the spec's document. Each `feat` block becomes an embed of the feature it maps to,
 * found by the source it records wherever it has moved since, or made; the file states the feature's fields. A feature
 * the document embedded that came from no block of this file was added in the app and keeps its place at the end; one
 * whose block the file dropped is deleted.
 */
export const take = async (spec: Spec.Spec, { path, text }: TakeOptions): Promise<TakeResult> => {
  const db = Obj.getDatabase(spec);
  const content = await loadContent(spec);
  const result: TakeResult = { created: [], updated: [] };
  if (!db || !content) {
    return result;
  }
  const previous = new Set(FeatureEmbed.parse(content.content ?? '').map(({ id }) => id));

  const blocks = FeatureSpec.parse(text);
  const existing = new Map<string, Feature.Feature>();
  if (blocks.length > 0) {
    const keys = blocks.map(({ id }) => ({ source: Feature.SPEC_KEY_SOURCE, id: FeatureSpec.getSource(path, id) }));
    for (const feature of (await db.query(Filter.foreignKeys(Feature.Feature, keys)).run()).filter(
      Feature.instanceOf,
    )) {
      for (const source of Feature.getSources(feature)) {
        existing.set(source, feature);
      }
    }
  }

  const changes: FeatureEmbed.Change[] = [];
  for (const { id, name, description, status, requirements, from, to } of blocks) {
    const source = FeatureSpec.getSource(path, id);
    let feature = existing.get(source);
    if (feature) {
      const container = Spec.getContainer(feature);
      // The block's embed lands in this document, so the feature moves here, unless the spec lies beneath it.
      if (container?.id !== spec.id && !Spec.isWithin(spec, feature)) {
        if (container) {
          await unembed(container, feature.id);
          detach(container, feature.id);
        }
        attach(spec, feature);
      }
      if (
        feature.name !== name ||
        (feature.description ?? '') !== (description ?? '') ||
        JSON.stringify(feature.requirements ?? []) !== JSON.stringify(requirements) ||
        (status !== undefined && status !== feature.status)
      ) {
        Obj.update(feature, (feature) => {
          feature.name = name;
          feature.description = description;
          feature.requirements = requirements;
          if (status !== undefined) {
            feature.status = status;
          }
        });
        result.updated.push(feature.id);
      }
    } else {
      feature = db.add(Feature.make({ name, description, requirements, status: status ?? FeatureSpec.DEFAULT_STATUS }));
      Feature.setSources(feature, [source]);
      attach(spec, feature);
      result.created.push(feature.id);
    }
    changes.push({ from, to, insert: makeEmbed(feature) });
  }

  let next = FeatureEmbed.apply(text, changes);
  const placed = new Set(FeatureEmbed.parse(next).map(({ id }) => id));
  const fromPath = (feature: Feature.Feature) =>
    Feature.getSources(feature).some((source) => Feature.getSpecPath(source) === Feature.getSpecPath(path));
  const removed: string[] = [];
  for (const feature of await Ref.loadAll(spec.features)) {
    if (previous.has(feature.id) && !placed.has(feature.id)) {
      if (fromPath(feature)) {
        removed.push(feature.id);
      } else {
        next = FeatureEmbed.apply(next, [FeatureEmbed.append(next, makeEmbed(feature))]);
      }
    }
  }
  if ((content.content ?? '') !== next) {
    Doc.updateText(content, 'content', next);
  }
  await sync(spec, { removed });
  return result;
};

/**
 * A spec's document written to its file with each feature as its `feat` block, and read back as embeds. A document no
 * object owns becomes the document of a new spec once its file holds a `feat` block.
 */
export const codec: ProjectCapabilities.SpecDocumentCodec = {
  write: async (document, { base }) => {
    const spec = Obj.getParent(document);
    return Spec.instanceOf(spec) ? expand(spec, { base }) : undefined;
  },
  read: async (document, text, { path }) => {
    const spec = adopt(document, { path, text });
    if (!spec) {
      return false;
    }
    await take(spec, { path, text });
    return true;
  },
};

const adopt = (document: SpecDocument.SpecDocument, { path, text }: TakeOptions): Spec.Spec | undefined => {
  const parent = Obj.getParent(document);
  if (Spec.instanceOf(parent)) {
    return parent;
  }
  const db = Obj.getDatabase(document);
  if (parent || !db || FeatureSpec.parse(text).length === 0) {
    return undefined;
  }
  return db.add(Spec.make({ name: document.name ?? path, document: Ref.make(document) }));
};

const loadContent = async (spec: Spec.Spec) => {
  const document = await spec.document.tryLoad();
  if (!SpecDocument.instanceOf(document)) {
    return undefined;
  }
  return document.content.tryLoad();
};

const loadIncludingDeleted = async (db: Database.Database, ids: string[]): Promise<Map<string, Obj.Unknown>> => {
  const objects = await db.query(Query.select(Filter.id(...ids)).options({ deleted: 'include' })).run();
  return new Map(objects.map((object) => [object.id, object]));
};

/** Another spec whose document embeds the object, if any. */
const findEmbedder = async (db: Database.Database, spec: Spec.Spec, id: string): Promise<Spec.Spec | undefined> => {
  const specs = await db.query(Filter.type(Spec.Spec)).run();
  for (const other of specs) {
    if (other.id !== spec.id && (await embeds(other, id))) {
      return other;
    }
  }
  return undefined;
};

const attach = (spec: Spec.Spec, feature: Feature.Feature): void => {
  Obj.update(spec, (spec) => {
    spec.features.push(Ref.make(feature));
  });
};

const detach = (spec: Spec.Spec, id: string): void => {
  const index = spec.features.findIndex((ref) => FeatureEmbed.entityId(ref.uri) === id);
  if (index !== -1 || spec.layout?.positions[id]) {
    Obj.update(spec, (spec) => {
      if (index !== -1) {
        spec.features.splice(index, 1);
      }
      if (spec.layout?.positions[id]) {
        delete spec.layout.positions[id];
      }
    });
  }
};
