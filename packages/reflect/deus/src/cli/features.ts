//
// Copyright 2026 DXOS.org
//

import * as Argument from 'effect/cli/Argument';
import * as Command from 'effect/cli/Command';
import * as Flag from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

import { parseMdlBlocks } from '../extension/blocks.ts';
import { frontmatter } from '../spec-index/parse.ts';
import { FeatureCheckError } from './errors.ts';
import { git } from './git.ts';
import { type ReviewItem, blockField, itemsUnder, keyList, reviewItems, reviewVerdicts } from './review.ts';

/** The authored statuses of `lang/features.mdl`, in the order a feature normally moves through them. */
export const FEATURE_STATUSES = ['planned', 'in-progress', 'prototype', 'operational', 'failing'] as const;

export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

/** What the reviews of a feature's spec items say, or `unreviewed` when an item has no verdict. */
export type DerivedStatus = Exclude<FeatureStatus, 'failing'> | 'unreviewed';

export type Feature = {
  id: string;
  title: string;
  line: number;
  status?: string;
  /** Repo-relative spec paths, each optionally `#<item id>`. */
  specs: string[];
  depends: string[];
};

/** Every `feature` block of a feature map. */
export const parseFeatureMap = (text: string): Feature[] =>
  parseMdlBlocks(text)
    .filter(({ type }) => type === 'feature')
    .map(({ id, title, body, from }) => ({
      id: id ?? '',
      title: title ?? '',
      line: text.slice(0, from).split('\n').length,
      status: blockField(body, 'status'),
      specs: keyList(blockField(body, 'specs')),
      depends: keyList(blockField(body, 'depends')),
    }));

/**
 * The status the reviews support: every item done is operational, done or untested is a prototype, every item
 * missing is planned, and anything between is in progress.
 */
export const deriveStatus = (statuses: ReadonlyArray<string | undefined>): DerivedStatus => {
  if (statuses.length === 0 || statuses.some((status) => status === undefined)) {
    return 'unreviewed';
  }
  if (statuses.every((status) => status === 'done')) {
    return 'operational';
  }
  if (statuses.every((status) => status === 'done' || status === 'untested')) {
    return 'prototype';
  }
  if (statuses.every((status) => status === 'missing')) {
    return 'planned';
  }
  return 'in-progress';
};

/** One spec item a feature cites, with the verdict its review gives it. */
export type FeatureItem = ReviewItem & { spec: string; status?: string; note?: string };

export type FeatureReport = {
  feature: Feature;
  derived: DerivedStatus;
  items: FeatureItem[];
};

export type FeatureMapReport = {
  reports: FeatureReport[];
  errors: string[];
  warnings: string[];
};

const REVIEW_SUFFIX = '.review.mdl';

/** Finds the first dependency cycle as the ids along it, closing on the id it started from. */
const findCycle = (features: ReadonlyArray<Feature>): string[] | undefined => {
  const depends = new Map(features.map(({ id, depends }) => [id, depends]));
  const done = new Set<string>();
  const visit = (id: string, trail: string[]): string[] | undefined => {
    if (trail.includes(id)) {
      return [...trail.slice(trail.indexOf(id)), id];
    }
    if (done.has(id)) {
      return undefined;
    }
    for (const next of depends.get(id) ?? []) {
      const cycle = visit(next, [...trail, id]);
      if (cycle) {
        return cycle;
      }
    }
    done.add(id);
    return undefined;
  };
  for (const { id } of features) {
    const cycle = visit(id, []);
    if (cycle) {
      return cycle;
    }
  }
  return undefined;
};

/**
 * Resolves every spec reference of a feature map against the checkout and its reviews, derives each feature's status,
 * and collects what is wrong (errors) or out of step (warnings).
 */
export const analyzeFeatureMap = Effect.fnUntraced(function* (mapPath: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* git(path.dirname(path.resolve(mapPath)), 'rev-parse', '--show-toplevel');
  const features = parseFeatureMap(yield* fs.readFileString(mapPath));
  const errors: string[] = [];
  const warnings: string[] = [];
  const exists = (file: string) => fs.exists(file).pipe(Effect.orElseSucceed(() => false));
  const readIfExists = Effect.fnUntraced(function* (file: string) {
    return (yield* exists(file)) ? yield* fs.readFileString(file) : undefined;
  });

  const byId = new Map<string, Feature>();
  for (const feature of features) {
    const at = `${mapPath}:${feature.line}: ${feature.id}`;
    if (byId.has(feature.id)) {
      errors.push(`${at}: second feature with this id`);
    }
    byId.set(feature.id, feature);
    if (!feature.status || !(FEATURE_STATUSES as readonly string[]).includes(feature.status)) {
      errors.push(`${at}: status \`${feature.status ?? ''}\`; use one of ${FEATURE_STATUSES.join(', ')}`);
    }
    if (feature.specs.length === 0) {
      errors.push(`${at}: cites no spec; a feature names the spec items that state it`);
    }
  }
  for (const feature of features) {
    for (const dependency of feature.depends) {
      if (!byId.has(dependency)) {
        errors.push(`${mapPath}:${feature.line}: ${feature.id}: depends on unknown feature ${dependency}`);
      }
    }
  }
  const cycle = findCycle(features);
  if (cycle) {
    errors.push(`${mapPath}: dependency cycle: ${cycle.join(' -> ')}`);
  }

  // A spec is read, and its review's staleness checked, once however many features cite it.
  const specs = new Map<string, { text?: string; verdicts: Map<string, { status?: string; note?: string }> }>();
  const loadSpec = Effect.fnUntraced(function* (spec: string, at: string) {
    const cached = specs.get(spec);
    if (cached) {
      return cached;
    }
    const file = path.resolve(root, spec);
    const text = yield* readIfExists(file);
    const reviewFile = file.replace(/\.mdl$/, REVIEW_SUFFIX);
    const review = text ? yield* readIfExists(reviewFile) : undefined;
    if (!text) {
      errors.push(`${at}: spec not found: ${spec}`);
    } else if (!review) {
      warnings.push(`${at}: ${spec} has no review; run the spec-review skill`);
    } else {
      const commit = frontmatter(review).commit;
      const changed = commit
        ? yield* git(root, 'rev-list', `${commit}..HEAD`, '--', spec).pipe(Effect.option)
        : Option.none<string>();
      const dirty = yield* git(root, 'status', '--porcelain', '--', spec).pipe(Effect.orElseSucceed(() => ''));
      if (Option.isNone(changed)) {
        warnings.push(`${at}: the review of ${spec} names a commit not in this clone`);
      } else if (changed.value !== '' || dirty !== '') {
        warnings.push(`${at}: ${spec} changed after its review (${commit?.slice(0, 8)}); re-review it`);
      }
    }
    const entry = { text, verdicts: review ? reviewVerdicts(review) : new Map() };
    specs.set(spec, entry);
    return entry;
  });

  const reports: FeatureReport[] = [];
  for (const feature of features) {
    const at = `${mapPath}:${feature.line}: ${feature.id}`;
    const items: FeatureItem[] = [];
    for (const ref of feature.specs) {
      const [spec, id] = ref.split('#');
      const { text, verdicts } = yield* loadSpec(spec, at);
      if (!text) {
        continue;
      }
      const cited = id ? itemsUnder(text, id) : reviewItems(text);
      if (cited.length === 0) {
        errors.push(`${at}: ${ref} names no reviewable item of the spec`);
      }
      items.push(...cited.map((item) => ({ ...item, spec, ...verdicts.get(item.id) })));
    }
    const derived = deriveStatus(items.map(({ status }) => status));
    const unjudged = items.filter(({ status }) => status === undefined).map(({ id }) => id);
    if (unjudged.length > 0 && unjudged.length < items.length) {
      warnings.push(`${at}: no verdict yet for ${unjudged.join(', ')}`);
    }
    if (feature.status && feature.status !== 'failing' && derived !== 'unreviewed' && feature.status !== derived) {
      warnings.push(`${at}: marked ${feature.status} but its reviews say ${derived}`);
    }
    for (const dependency of feature.depends) {
      const status = byId.get(dependency)?.status;
      if (feature.status !== 'planned' && (status === 'planned' || status === 'failing')) {
        warnings.push(`${at}: blocked: depends on ${dependency}, which is ${status}`);
      } else if (feature.status === 'operational' && status !== 'operational') {
        warnings.push(`${at}: operational ahead of its dependency ${dependency} (${status})`);
      }
    }
    if (feature.status === 'in-progress') {
      const dirs = new Set(
        items.flatMap(({ spec }) => {
          const dir = path.dirname(path.resolve(root, spec));
          return ['spec', 'docs'].includes(path.basename(dir)) ? [dir, path.dirname(dir)] : [dir];
        }),
      );
      let planned = false;
      for (const dir of dirs) {
        const tasks = yield* readIfExists(path.join(dir, 'TASKS.md'));
        planned ||=
          tasks !== undefined && new RegExp(`^#{2,3} .*\\b${feature.id.replace(/\./g, '\\.')}\\b`, 'm').test(tasks);
      }
      if (!planned) {
        warnings.push(
          `${at}: partly built with no work planned: no TASKS.md beside its spec has a \`## ${feature.id}\` section`,
        );
      }
    }
    reports.push({ feature, derived, items });
  }

  return { reports, errors, warnings } satisfies FeatureMapReport;
});

const DEFAULT_MAP = 'FEATURES.mdl';

const resolveMap = Effect.fnUntraced(function* (map: Option.Option<string>) {
  if (Option.isSome(map)) {
    return map.value;
  }
  const path = yield* Path.Path;
  return path.join(yield* git(process.cwd(), 'rev-parse', '--show-toplevel'), DEFAULT_MAP);
});

const mapFlag = Flag.String('map').pipe(
  Flag.withDescription(`The feature map; defaults to ${DEFAULT_MAP} at the repository root.`),
  Flag.optional,
);

/** Prints one row per feature, then every warning and error; fails when there is an error. */
export const checkFeatures = Effect.fnUntraced(function* (mapPath: string) {
  const { reports, errors, warnings } = yield* analyzeFeatureMap(mapPath);
  for (const { feature, derived, items } of reports) {
    const done = items.filter(({ status }) => status === 'done').length;
    yield* Console.log(`${feature.id}\t${feature.status ?? ''}\t${derived}\t${done}/${items.length} done`);
  }
  for (const warning of warnings) {
    yield* Console.log(`warning: ${warning}`);
  }
  for (const error of errors) {
    yield* Console.log(`error: ${error}`);
  }
  yield* Console.log(`${reports.length} features; ${errors.length} errors, ${warnings.length} warnings.`);
  if (errors.length > 0) {
    return yield* Effect.fail(new FeatureCheckError({ context: { errors: errors.length } }));
  }
});

/** The first sentence of a verdict note, so a task line stays one line. */
const firstSentence = (note: string | undefined): string =>
  (note ?? '').replace(/\s+/g, ' ').match(/^.*?[.!?](?=\s|$)/)?.[0] ?? (note ?? '').trim();

/** Prints the open work of one feature as a TASKS.md section: one task per spec item not yet done. */
export const featureTasks = Effect.fnUntraced(function* (mapPath: string, id: string) {
  const { reports } = yield* analyzeFeatureMap(mapPath);
  const report = reports.find(({ feature }) => feature.id === id);
  if (!report) {
    return yield* Effect.fail(new FeatureCheckError({ context: { feature: id, reason: 'not on the map' } }));
  }
  yield* Console.log(`## ${report.feature.id}: ${report.feature.title}\n`);
  let spec: string | undefined;
  for (const item of report.items.filter(({ status }) => status !== 'done')) {
    if (item.spec !== spec) {
      spec = item.spec;
      yield* Console.log(`Spec: \`${spec}\`\n`);
    }
    const why = item.status ? `${item.status}${item.note ? `: ${firstSentence(item.note)}` : ''}` : 'unreviewed';
    yield* Console.log(`- [ ] ${item.id}: ${item.title} (${why})`);
  }
});

const check = Command.make('check', { map: mapFlag }, ({ map }) => Effect.flatMap(resolveMap(map), checkFeatures)).pipe(
  Command.withDescription(
    'Check the feature map against the specs and their reviews: `<id>\\t<status>\\t<derived>\\t<done>/<items> done`.',
  ),
);

const tasks = Command.make(
  'tasks',
  { map: mapFlag, feature: Argument.String('feature').pipe(Argument.withDescription('The feature id.')) },
  ({ map, feature }) => Effect.flatMap(resolveMap(map), (mapPath) => featureTasks(mapPath, feature)),
).pipe(Command.withDescription('Print the open spec items of one feature as a TASKS.md section.'));

export const features = Command.make('features').pipe(
  Command.withDescription('Feature map tools: the top of feature map > specs > tasks > code > result.'),
  Command.withSubcommands([check, tasks]),
);
