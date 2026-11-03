//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import * as Spec from '@dxos/compute/Spec';
import { Annotation, DXN, Format, Obj, Ref, Relation, Text, Type } from '@dxos/echo';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { EntityId } from '@dxos/keys';
import { Task } from '@dxos/types';

//
// Status
//

/**
 * How far the feature has come; authored by whoever knows, never derived. Whether someone is working on it is a
 * separate axis, derived from its linked tasks, so an operational feature can be under work as well as a planned one.
 */
export const Status = Schema.Literals(['planned', 'prototype', 'operational', 'failing']);
export type Status = Schema.Schema.Type<typeof Status>;

export const StatusOptions: Task.Option<Status>[] = [
  { id: 'planned', title: 'Planned', color: 'neutral', icon: 'ph--circle-dashed--regular' },
  { id: 'prototype', title: 'Prototype', color: 'amber', icon: 'ph--flask--regular' },
  { id: 'operational', title: 'Operational', color: 'emerald', icon: 'ph--seal-check--regular' },
  { id: 'failing', title: 'Failing', color: 'rose', icon: 'ph--warning-octagon--regular' },
];

//
// Code links
//

/** What a `@feature` tag documents: a `describe` block, a single test, or any other symbol. */
export const CodeLinkKind = Schema.Literals(['suite', 'test', 'code']);
export type CodeLinkKind = Schema.Schema.Type<typeof CodeLinkKind>;

/** A place in the repository whose JSDoc cites the feature with a `@feature` tag. */
export const CodeLink = Schema.Struct({
  /** Repo path of the file. */
  path: Schema.String,
  /** 1-based line of the tag. */
  line: Schema.Number,
  /** The symbol the comment documents: a test or suite title, or a declaration name. */
  symbol: Schema.optional(Schema.String),
  kind: CodeLinkKind,
});
export type CodeLink = Schema.Schema.Type<typeof CodeLink>;

//
// Feature
//

/**
 * One thing the feature must do, as stated in its spec; `id` is the spec's own (`F-3.2`) when it came from one. This is
 * the requirement in a list (operation input and output, a spec block), where `key` names the record it is stored as.
 */
export const Requirement = Schema.Struct({
  key: Schema.optional(Schema.String.pipe(Annotation.FormInputAnnotation.set(false))),
  id: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Id' }))),
  text: Schema.String.pipe(Schema.annotate({ title: 'Requirement' })),
});
export type Requirement = Schema.Schema.Type<typeof Requirement>;

/** A requirement as read from or written to a feature, with the key of its record. */
export type KeyedRequirement = Requirement & { key: string };

/** A requirement as the feature stores it, under its key in `requirements`. */
export const RequirementRecord = Schema.Struct({
  id: Schema.optional(Schema.String),
  text: Schema.String,
});
export type RequirementRecord = Schema.Schema.Type<typeof RequirementRecord>;

/**
 * A goal state: something the product should do, with the requirements that define it. A feature belongs to the spec
 * whose document embeds it (its ECHO parent, which lists it in `features`), and nests by owning a spec of its own that
 * breaks it down. The feature is the canonical record of its content; a spec file's `feat` block is that content as
 * text, read in on import and written out on export. Where a block came from is a foreign key in its meta
 * ({@link SPEC_KEY_SOURCE}, `path#F-3`).
 */
export class Feature extends Type.makeObject<Feature>(DXN.make('org.dxos.type.feature', '0.5.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name', description: 'A noun phrase of two to five words.' })),

    description: Schema.optional(
      Schema.String.pipe(
        Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
        Schema.annotate({
          title: 'Description',
          description:
            'One or two short sentences: the ideal, what the feature does when complete, in the present tense. Not its current state.',
        }),
      ),
    ),

    /**
     * Each requirement under a key that never changes, as a sheet holds its cells, so comments anchored into one find
     * it however the list is edited; `requirementOrder` holds the order.
     */
    requirements: Schema.optional(
      Schema.Record(Schema.String, RequirementRecord).pipe(
        Schema.annotate({
          title: 'Requirements',
          description:
            'What the feature must do: one short, testable sentence each, extracted from its spec block (its req lines) where there is one.',
        }),
      ),
    ),

    /** The keys of `requirements` in the order they read; a reorder moves keys here and leaves the texts alone. */
    requirementOrder: Schema.optional(Schema.Array(Schema.String).pipe(Annotation.FormInputAnnotation.set(false))),

    status: Status.pipe(
      Format.FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      Schema.annotate({
        title: 'Status',
        [PropertyMetaAnnotationId]: { singleSelect: { options: StatusOptions } },
      }),
    ),

    /**
     * The spec that breaks this feature down into features of its own; owned, so deleting the feature deletes it.
     * Suspended because the spec module refers back to this one.
     */
    spec: Schema.optional(
      Schema.suspend((): Ref.RefSchema<Spec.Spec> => Ref.Ref(Spec.Spec)).pipe(
        Annotation.SetParent.set(),
        Annotation.FormInputAnnotation.set(false),
      ),
    ),

    /**
     * The code that cites this feature with a `@feature` tag, as last imported from a scan of the repository; held
     * here so the feature map reads it without the repository.
     */
    code: Schema.optional(Schema.Array(CodeLink).pipe(Annotation.FormInputAnnotation.set(false))),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--puzzle-piece--regular', hue: 'violet' }),
    // The project skill carries the feature operations (linking tasks, dependencies); a chat about a
    // feature needs them. Plain dotted key, so the type does not import the skill.
    Skill.SkillsAnnotation.set(['org.dxos.skill.project']),
    Annotation.UserType.set(),
  ),
) {}

export type MakeProps = Omit<Obj.MakeProps<typeof Feature>, 'requirements' | 'requirementOrder'> & {
  requirements?: readonly Requirement[];
};

/** The requirement fields start empty rather than unset, so two peers lazily creating them cannot each write fresh ones. */
export const make = ({ requirements = [], ...props }: MakeProps): Feature =>
  Obj.make(Feature, { ...props, ...makeRequirementFields(requirements) });

export const instanceOf = (value: unknown): value is Feature => Obj.instanceOf(Feature, value);

/** A requirement key: a field name a form path can address, as `r` and a word when it would start otherwise. */
const toKey = (value: string): string => {
  const key = value.replace(/\W/g, '_');
  return /^[A-Za-z_]/.test(key) ? key : `r${key}`;
};

/**
 * The stored form of a requirement list. Each keeps its key, else is keyed by its spec id, else by its position,
 * suffixed while taken, so peers converting the same list write the same keys.
 */
export const makeRequirementFields = (
  list: readonly Requirement[],
): Pick<Feature, 'requirements' | 'requirementOrder'> => {
  const taken = new Set<string>();
  const keyed = list.map((requirement, index) => {
    const base = toKey(requirement.key || requirement.id || `${index}`);
    let key = base;
    for (let suffix = 1; taken.has(key); suffix++) {
      key = `${base}_${suffix}`;
    }
    taken.add(key);
    return { ...requirement, key };
  });
  return {
    requirements: Object.fromEntries(keyed.map(({ key, ...requirement }) => [key, toRecord(requirement)])),
    requirementOrder: keyed.map(({ key }) => key),
  };
};

const toRecord = ({ id, text }: Requirement): RequirementRecord => (id === undefined ? { text } : { id, text });

/**
 * The feature's requirements in order, each with its key: those the order lists, skipping a key it repeats or has no
 * record for, then any record it leaves out, by key, so a record written without its place still shows and is kept.
 */
export const getRequirements = (feature: Feature | Obj.Snapshot<Feature>): KeyedRequirement[] => {
  const records = feature.requirements ?? {};
  const ordered = [...new Set(feature.requirementOrder ?? [])].filter((key) => Object.hasOwn(records, key));
  const unordered = Object.keys(records)
    .filter((key) => !ordered.includes(key))
    .sort();
  return [...ordered, ...unordered].map((key) => ({ key, ...records[key] }));
};

/**
 * `next` with every requirement keyed. One without a key takes the key of an unclaimed requirement in `previous`
 * with the same spec id, else the same text, else a new key, so a rewritten list keeps the keys comments anchor to.
 * Keys come out unique: a key `next` repeats is replaced on its later uses.
 */
const keyRequirements = (next: readonly Requirement[], previous: readonly KeyedRequirement[]): KeyedRequirement[] => {
  const unclaimed = previous.filter(({ key }) => !next.some((requirement) => requirement.key === key));
  const claim = (match: (requirement: Requirement) => boolean): string | undefined => {
    const index = unclaimed.findIndex(match);
    return index === -1 ? undefined : unclaimed.splice(index, 1)[0].key;
  };
  // A key that names a stored record is kept as written, so its anchors still resolve; only a new one is made a key.
  const stored = new Set(previous.map(({ key }) => key));
  const byId = next.map(({ key, id }) =>
    key ? (stored.has(key) ? key : toKey(key)) : id === undefined ? undefined : claim((previous) => previous.id === id),
  );
  const taken = new Set<string>();
  return next.map((requirement, index) => {
    const candidate = byId[index] ?? claim((previous) => previous.text === requirement.text);
    const key = candidate === undefined || taken.has(candidate) ? toKey(EntityId.random()) : candidate;
    taken.add(key);
    return { ...requirement, key };
  });
};

/**
 * Writes `next` over the feature's requirements, numbered under `blockId` when given (see `numberRequirements`). A
 * requirement whose key survives (see `keyRequirements`) keeps its record and has its text edited rather than replaced,
 * so comment cursors inside it survive. The order is edited in place, so a requirement a peer adds meanwhile stays.
 */
export const setRequirements = (
  feature: Feature,
  next: readonly Requirement[],
  { blockId }: { blockId?: string } = {},
): void => {
  const keyed = keyRequirements(next, getRequirements(feature));
  const list = blockId ? numberRequirements(blockId, keyed) : keyed;
  const keys = list.map(({ key }) => key);
  Obj.update(feature, (feature) => {
    const records = (feature.requirements ??= {});
    const order = (feature.requirementOrder ??= []);
    for (const key of Object.keys(records)) {
      if (!keys.includes(key)) {
        delete records[key];
      }
    }
    list.forEach((requirement) => {
      const { key } = requirement;
      const record = Object.hasOwn(records, key) ? records[key] : undefined;
      if (!record) {
        records[key] = toRecord(requirement);
        return;
      }
      if (requirement.id === undefined) {
        delete record.id;
      } else if (record.id !== requirement.id) {
        record.id = requirement.id;
      }
      if (record.text !== requirement.text) {
        Text.update(feature, ['requirements', key, 'text'], requirement.text);
      }
    });
    for (let index = order.length - 1; index >= 0; index--) {
      if (!keys.includes(order[index]) || order.indexOf(order[index]) !== index) {
        order.splice(index, 1);
      }
    }
    keys.forEach((key, index) => {
      if (order[index] !== key) {
        const from = order.indexOf(key);
        if (from !== -1) {
          order.splice(from, 1);
        }
        order.splice(index, 0, key);
      }
    });
  });
};

/**
 * The spec blocks the feature was read in from, e.g. `packages/plugins/plugin-inbox/PLUGIN.mdl#F-3`: its foreign keys
 * under {@link SPEC_KEY_SOURCE}, so a re-import updates the feature rather than adding another.
 */
export const getSources = (feature: Feature | Obj.Snapshot<Feature>): string[] =>
  Obj.getMeta(feature)
    .keys.filter(({ source }) => source === SPEC_KEY_SOURCE)
    .map(({ id }) => id);

/** The feature's block id (`F-3`): the one it was read in from, or the one its spec numbered it with. */
export const getBlockId = (feature: Feature | Obj.Snapshot<Feature>): string | undefined =>
  getSources(feature)
    .map((source) => source.match(/#(.+)$/)?.[1])
    .find((id) => id !== undefined);

/** Sets the spec blocks the feature was read in from, leaving its other foreign keys. */
export const setSources = (feature: Obj.Mutable<Feature>, sources: readonly string[]): void => {
  const current = getSources(feature);
  if (current.length === sources.length && current.every((source, index) => source === sources[index])) {
    return;
  }
  const keys = Obj.getMeta(feature).keys;
  keys.splice(
    0,
    keys.length,
    ...keys.filter(({ source }) => source !== SPEC_KEY_SOURCE),
    ...sources.map((id) => ({ source: SPEC_KEY_SOURCE, id })),
  );
};

/**
 * The requirements with an id for each that has none, numbered under the feature's block id after the highest given
 * (`F-3.4`); ids once given are kept, since text and code cite them.
 */
export const numberRequirements = <T extends Requirement>(blockId: string, requirements: readonly T[]): T[] => {
  const prefix = `${blockId}.`;
  let next =
    Math.max(0, ...requirements.map(({ id }) => (id?.startsWith(prefix) ? Number(id.slice(prefix.length)) || 0 : 0))) +
    1;
  return requirements.map((requirement) =>
    requirement.id ? requirement : { ...requirement, id: `${prefix}${next++}` },
  );
};

/**
 * Whether adding `source → target` to the `DependsOn` edges would close a cycle, i.e. `source` is already
 * reachable from `target`. Returns the path `target … source` when it would, so the caller can name it.
 */
export const findDependencyCycle = (
  edges: readonly (readonly [source: string, target: string])[],
  source: string,
  target: string,
): string[] | undefined => {
  const next = new Map<string, string[]>();
  for (const [from, to] of edges) {
    next.set(from, [...(next.get(from) ?? []), to]);
  }
  const visit = (id: string, path: string[]): string[] | undefined => {
    if (id === source) {
      return path;
    }
    for (const to of next.get(id) ?? []) {
      if (!path.includes(to)) {
        const found = visit(to, [...path, to]);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  };
  return visit(target, [target]);
};

/**
 * The DXN that names the feature in code: its `meta.key` with its mnemonic, e.g.
 * `dxn:network.dxos.team.features.mcp.codeMode#ABC123`. Undefined when the feature has no valid `meta.key`.
 */
export const getLink = (feature: Feature | Obj.Snapshot<Feature>): DXN.DXN | undefined => {
  const key = Obj.getMeta(feature).key;
  const name = key ? DXN.tryMake(`dxn:${key}`) : undefined;
  return name && DXN.withMnemonic(DXN.withoutMnemonic(name), Obj.getMnemonic(feature));
};

/** Repository that relative spec paths resolve against. */
export const DEFAULT_SPEC_REPOSITORY = 'https://github.com/dxos/dxos';

/**
 * Where a spec opens on GitHub: a URL is kept; a repo path (`packages/…/PLUGIN.mdl#F-3`) opens its file on the
 * default branch, without the block anchor, which GitHub cannot resolve inside an `.mdl` file.
 */
export const getSpecUrl = (spec: string, repository = DEFAULT_SPEC_REPOSITORY): string =>
  /^https?:\/\//.test(spec) ? spec : `${repository}/blob/main/${getSpecPath(spec)}`;

/** Where a code link opens on GitHub: its file on the default branch, at its line. */
export const getCodeUrl = (link: Pick<CodeLink, 'path' | 'line'>, repository = DEFAULT_SPEC_REPOSITORY): string =>
  `${repository}/blob/main/${link.path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}#L${link.line}`;

/** A repo spec path without its block anchor or leading slashes. */
export const getSpecPath = (spec: string): string => spec.replace(/#.*$/, '').replace(/^\/+/, '');

/** The parts of a plugin's profile that say where its bundled spec comes from. */
export type SpecSource = { key: string; source?: string; spec?: string };

/**
 * The key of the plugin that bundles the spec a repo path names: the path is the plugin's source directory joined
 * with its spec file (`packages/plugins/plugin-inbox/PLUGIN.mdl`), so the app can open the spec without GitHub.
 */
export const findSpecPlugin = (spec: string, plugins: readonly SpecSource[]): string | undefined => {
  if (/^https?:\/\//.test(spec)) {
    return undefined;
  }
  const path = getSpecPath(spec);
  return plugins.find(({ source, spec: file }) => {
    const directory = source?.match(/\/tree\/[^/]+\/(.+?)\/?$/)?.[1];
    return !!directory && !!file && path === `${directory}/${file}`;
  })?.key;
};

/** Foreign-key source of a spec imported into a space, whose key id is its repo path. */
export const SPEC_KEY_SOURCE = 'github.com/dxos/dxos';

//
// Relations
//

/** Source does not work without target. Features form a DAG through this relation. */
export class DependsOn extends Type.makeRelation<DependsOn>(DXN.make('org.dxos.relation.dependsOn', '0.1.0'))({
  source: Feature,
  target: Feature,
})(Schema.Struct({ id: Obj.ID })) {}

export const makeDependsOn = (props: Relation.MakeProps<typeof DependsOn>) => Relation.make(DependsOn, props);

/** Source task is work toward the target feature; a task can move several features and a feature has many tasks. */
export class Implements extends Type.makeRelation<Implements>(DXN.make('org.dxos.relation.implements', '0.1.0'))({
  source: Task.Task,
  target: Feature,
})(Schema.Struct({ id: Obj.ID })) {}

export const makeImplements = (props: Relation.MakeProps<typeof Implements>) => Relation.make(Implements, props);
