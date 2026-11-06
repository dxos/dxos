//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import {
  type BlockPart,
  type BlockSchema,
  SOFTWARE_DIALECT,
  isNumberedId,
  mintKey,
  offsetMap,
  partSource,
  printBlock,
  resolveBlockSchemas,
  specItems,
} from '@dxos/deus/schema';
import { Annotation, Database, Filter, Obj, Ref, Relation, Text } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { type Text as TextType } from '@dxos/schema';
import { AnchoredTo, Task } from '@dxos/types';

import { Feature, FeatureEmbed, FeatureMap, Showcase, SpecItem } from '#types';

import * as FeatureAnchor from '../util/feature-anchor.ts';

const CORE_DIALECT = 'org.dxos.spec.core';

/** The meta key source of a spec synced with a GitHub file; such a spec keeps the `F-n` ids its file writes. */
const GITHUB_SOURCE = 'github.com';

export type FoldResult = { specs: number; features: number; relations: number; threads: number };

/** Where a folded feature went: its spec and its block's key, and each requirement's key by its old one. */
type Placement = { spec: Spec.Spec; key: string; requirements: ReadonlyMap<string, string> };

type Folding = { spec: Spec.Spec; text: TextType.Text; features: Feature.Feature[]; owned: boolean };

const isFileSynced = (spec: Spec.Spec) => Obj.getMeta(spec).keys.some(({ source }) => source.startsWith(GITHUB_SOURCE));

const entityId = (uri: string) => FeatureEmbed.entityId(uri);

const loadOptional = <T>(ref: Ref.Ref<T>) =>
  Database.load(ref).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)));

/** The highest `F-n` among ids, so positional ids for a file-synced spec continue after it. */
const lastNumber = (ids: Iterable<string>) =>
  Math.max(0, ...[...ids].map((id) => Number(id.match(/^F-(\d+)$/)?.[1] ?? 0)));

/** Keys for a spec's features and their requirements: fresh keys, or `F-n` and `F-n.m` for a file-synced spec. */
const place = (folding: Folding, schemas: ReadonlyMap<string, BlockSchema>): Map<string, Placement> => {
  const taken = new Set(specItems(folding.text.content, schemas).map(({ key }) => key));
  let next = lastNumber([...taken, ...folding.features.flatMap((feature) => Feature.getBlockId(feature) ?? [])]) + 1;
  const mint = () => {
    const key = mintKey(taken);
    taken.add(key);
    return key;
  };
  return new Map(
    folding.features.map((feature) => {
      const blockId = Feature.getBlockId(feature);
      const key = folding.owned
        ? mint()
        : blockId && isNumberedId(blockId, 'F') && !taken.has(blockId)
          ? blockId
          : `F-${next++}`;
      taken.add(key);
      const requirements = folding.owned
        ? Feature.getRequirements(feature).map(({ key: old }) => [old, mint()] as const)
        : Feature.numberRequirements(key, Feature.getRequirements(feature)).map(
            ({ key: old, id }) => [old, id!] as const,
          );
      return [feature.id, { spec: folding.spec, key, requirements: new Map(requirements) }];
    }),
  );
};

/** A citation of a placed item from `spec`: its key there, else its spec item link. */
const cite = (from: Spec.Spec, { spec, key }: Placement) => (spec.id === from.id ? key : SpecItem.citation(spec, key));

/**
 * Folds every feature object of the space into its spec's text as a `feat` block, once: the block is the feature from
 * then on. Requirements keep their text under keys of their own, dependencies become `needs`, a breakdown becomes the
 * block's `spec` with the breakdown filed flat in the project, and comments, task links, showcases and canvas positions
 * move to the spec and the item's key. A spec of the features dialect moves to the software dialect. A second run finds
 * nothing to fold.
 */
export const foldFeatures = Effect.fn('foldFeatures')(function* () {
  const result: FoldResult = { specs: 0, features: 0, relations: 0, threads: 0 };
  const specs = (yield* Database.query(Filter.type(Spec.Spec)).run).filter(
    (spec) => spec.dialects.includes(FeatureMap.DIALECT) || FeatureMap.getFeatures(spec).length > 0,
  );
  if (specs.length === 0) {
    return result;
  }

  const foldings: Folding[] = [];
  for (const spec of specs) {
    const text = yield* loadOptional(spec.content);
    if (!text) {
      continue;
    }
    const features = [];
    for (const ref of FeatureMap.getFeatures(spec)) {
      const feature = yield* loadOptional(ref);
      Feature.instanceOf(feature) && features.push(feature);
    }
    foldings.push({ spec, text, features, owned: !isFileSynced(spec) });
  }

  const featSchema = resolveBlockSchemas('', { dialects: [SOFTWARE_DIALECT] }).get('feat')!;
  const schemasOf = ({ spec, text }: Folding) =>
    resolveBlockSchemas(text.content, { dialects: [CORE_DIALECT, SOFTWARE_DIALECT, ...spec.dialects] });
  const placements = new Map<string, Placement>();
  for (const folding of foldings) {
    for (const [id, placement] of place(folding, schemasOf(folding))) {
      placements.set(id, placement);
    }
  }
  const featureIds = [...placements.keys()];
  const byTarget = <T extends Relation.Unknown>(relations: readonly T[]) => {
    const map = new Map<string, T[]>();
    for (const relation of relations) {
      const target = entityId(Relation.getTargetURI(relation));
      placements.has(target) && map.set(target, [...(map.get(target) ?? []), relation]);
    }
    return map;
  };
  const any = featureIds.length > 0;
  const dependsOn = any ? yield* Database.query(Filter.type(Feature.DependsOn)).run : [];
  const implementsByFeature = byTarget(any ? yield* Database.query(Filter.type(Feature.Implements)).run : []);
  const demonstratesByFeature = byTarget(any ? yield* Database.query(Filter.type(Showcase.Demonstrates)).run : []);
  const threadsByFeature = byTarget(any ? yield* Database.query(Filter.type(AnchoredTo.AnchoredTo)).run : []);
  const sourcesOf = Effect.fnUntraced(function* (relations: readonly Relation.Unknown[]) {
    const ids = [...new Set(relations.map((relation) => entityId(Relation.getSourceURI(relation))))];
    const objects = ids.length > 0 ? yield* Database.query(Filter.id(...ids)).run : [];
    return new Map(objects.map((object) => [object.id, object]));
  });

  for (const folding of foldings) {
    const { spec, text, features } = folding;
    const content = text.content;

    // Each owned feature written out where its embed stood, or appended; another spec's feature cited by link.
    const blocks = new Map(
      features.map((feature) => {
        const placement = placements.get(feature.id)!;
        const needs = dependsOn
          .filter((relation) => entityId(Relation.getSourceURI(relation)) === feature.id)
          .flatMap((relation) => placements.get(entityId(Relation.getTargetURI(relation))) ?? [])
          .map((target) => cite(spec, target));
        const breakdown = feature.spec && entityId(feature.spec.uri);
        const block = printBlock(featSchema, placement.key, {
          title: feature.name,
          ...(feature.description && { prose: feature.description }),
          fields: {
            status: feature.status,
            ...(needs.length > 0 && { needs }),
            ...(breakdown && { spec: `echo:///${breakdown}` }),
            req: Feature.getRequirements(feature).map(({ key, text }) => ({
              key: placement.requirements.get(key)!,
              text,
            })),
          },
        });
        return [feature.id, block];
      }),
    );
    const embedded = new Set<string>();
    const changes = FeatureEmbed.parse(content).flatMap(({ id, label, from, to }): FeatureEmbed.Change[] => {
      const block = blocks.get(id);
      if (block && !embedded.has(id)) {
        embedded.add(id);
        const lineStart = content.lastIndexOf('\n', from - 1) + 1;
        const lineEnd = content.indexOf('\n', to);
        const alone =
          content.slice(lineStart, from).trim() === '' &&
          content.slice(to, lineEnd === -1 ? content.length : lineEnd).trim() === '';
        return [{ from, to, insert: alone ? block : `\n\n${block}\n\n` }];
      }
      const placement = placements.get(id);
      return placement ? [{ from, to, insert: `[${label}](${SpecItem.citation(placement.spec, placement.key)})` }] : [];
    });
    let next = FeatureEmbed.apply(content, changes);
    for (const feature of features) {
      if (!embedded.has(feature.id)) {
        next = FeatureEmbed.apply(next, [FeatureEmbed.append(next, blocks.get(feature.id)!)]);
      }
    }
    Obj.update(text, (text) => {
      Text.update(text, 'content', next);
    });

    // Threads anchored in a feature's fields move to the same words in its block, or to the part when they are gone.
    const items = specItems(next, schemasOf(folding));
    const accessor = Doc.createAccessor(text, ['content']);
    for (const feature of features) {
      const placement = placements.get(feature.id)!;
      const item = items.find(({ kind, key, entry }) => kind === 'feat' && key === placement.key && !entry);
      const threads = threadsByFeature.get(feature.id) ?? [];
      const sources = yield* sourcesOf(threads);
      for (const relation of threads) {
        const thread = sources.get(entityId(Relation.getSourceURI(relation)));
        if (!item || !thread) {
          continue;
        }
        const resolved = relation.anchor ? FeatureAnchor.resolve(feature, relation.anchor) : undefined;
        const [field, requirement] = resolved?.path ?? ['name'];
        const part: BlockPart =
          field === 'description'
            ? { part: 'prose' }
            : field === 'requirements'
              ? { part: 'field', name: 'req', key: placement.requirements.get(String(requirement)) }
              : { part: 'title' };
        const source = partSource(next, item.block, featSchema, part);
        const words = relation.anchor ? FeatureAnchor.getText(feature, relation.anchor) : undefined;
        const at = words ? source.value.indexOf(words) : -1;
        const map = offsetMap(source.value, next.slice(source.from, source.to), source.from);
        const [from, to] =
          at === -1 ? [source.from, source.to] : [map.toSource(at), map.toSource(at + words!.length - 1) + 1];
        yield* Database.add(
          AnchoredTo.make({
            [Relation.Source]: thread,
            [Relation.Target]: spec,
            anchor: toCursorRange(accessor, from, to),
          }),
        );
        yield* Database.remove(relation);
        result.threads++;
      }
    }

    // Task links and showcases name the item; the canvas keeps its positions by key.
    for (const feature of features) {
      const { key } = placements.get(feature.id)!;
      const tasks = implementsByFeature.get(feature.id) ?? [];
      const taskSources = yield* sourcesOf(tasks);
      for (const relation of tasks) {
        const task = taskSources.get(entityId(Relation.getSourceURI(relation)));
        if (Obj.instanceOf(Task.Task, task)) {
          yield* Database.add(SpecItem.makeImplements({ [Relation.Source]: task, [Relation.Target]: spec, item: key }));
        }
        yield* Database.remove(relation);
        result.relations++;
      }
      const showcases = demonstratesByFeature.get(feature.id) ?? [];
      const showcaseSources = yield* sourcesOf(showcases);
      for (const relation of showcases) {
        const showcase = showcaseSources.get(entityId(Relation.getSourceURI(relation)));
        if (showcase) {
          yield* Database.add(
            Showcase.makeDemonstrates({ [Relation.Source]: showcase, [Relation.Target]: spec, item: key }),
          );
        }
        yield* Database.remove(relation);
        result.relations++;
      }
    }
    const layout = FeatureMap.getLayout(spec);
    if (layout) {
      Annotation.update(spec, FeatureMap.LayoutAnnotation, (layout) => {
        for (const feature of features) {
          const position = layout.positions[feature.id];
          if (position) {
            layout.positions[placements.get(feature.id)!.key] = position;
            delete layout.positions[feature.id];
          }
        }
      });
    }

    // A breakdown is filed flat in the project, before its feature goes: a feature's deletion takes its children.
    const project = Project.getOwner(FeatureMap.getAncestry(spec).at(-1) ?? spec);
    for (const feature of features) {
      const breakdown = feature.spec && (yield* loadOptional(feature.spec));
      if (Spec.instanceOf(breakdown)) {
        if (project) {
          Obj.update(project, (project) => {
            project.specs.push(Ref.make(breakdown));
          });
        } else {
          Obj.setParent(breakdown, undefined);
        }
      }
    }
    for (const feature of features) {
      for (const relation of dependsOn.filter((relation) => entityId(Relation.getSourceURI(relation)) === feature.id)) {
        yield* Database.remove(relation);
        result.relations++;
      }
      yield* Database.remove(feature);
      result.features++;
    }
    Obj.update(spec, (spec) => {
      Annotation.set(spec, FeatureMap.FeaturesAnnotation, []);
      const dialects = [
        ...new Set(spec.dialects.map((dialect) => (dialect === FeatureMap.DIALECT ? SOFTWARE_DIALECT : dialect))),
      ];
      spec.dialects.splice(0, spec.dialects.length, ...dialects);
    });
    result.specs++;
  }
  return result;
});
