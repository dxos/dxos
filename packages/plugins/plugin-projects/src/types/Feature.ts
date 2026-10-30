//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import * as Spec from '@dxos/compute/Spec';
import { Annotation, DXN, Format, Obj, Ref, Relation, Type } from '@dxos/echo';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';
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

/** One thing the feature must do, as stated in its spec; `id` is the spec's own (`F-3.2`) when it came from one. */
export const Requirement = Schema.Struct({
  id: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Id' }))),
  text: Schema.String.pipe(Schema.annotate({ title: 'Requirement' })),
});
export type Requirement = Schema.Schema.Type<typeof Requirement>;

/**
 * A goal state: something the product should do, with the requirements that define it. A feature belongs to the spec
 * whose document embeds it (its ECHO parent, which lists it in `features`), and nests by owning a spec of its own that
 * breaks it down. The feature is the canonical record of its content; a spec file's `feat` block is that content as
 * text, read in on import and written out on export. Where a block came from is a foreign key in its meta
 * ({@link SPEC_KEY_SOURCE}, `path#F-3`).
 */
export class Feature extends Type.makeObject<Feature>(DXN.make('org.dxos.type.feature', '0.4.0'))(
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

    requirements: Schema.optional(
      Schema.Array(Requirement).pipe(
        Schema.annotate({
          title: 'Requirements',
          description:
            'What the feature must do: one short, testable sentence each, extracted from its spec block (its req lines) where there is one.',
        }),
      ),
    ),

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

/** `requirements` starts as an empty list so two peers lazily creating it cannot each write a fresh one. */
export const make = (props: Obj.MakeProps<typeof Feature>): Feature =>
  Obj.make(Feature, { requirements: [], ...props });

export const instanceOf = (value: unknown): value is Feature => Obj.instanceOf(Feature, value);

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
export const setSources = (feature: Feature, sources: readonly string[]): void => {
  const current = getSources(feature);
  if (current.length === sources.length && current.every((source, index) => source === sources[index])) {
    return;
  }
  Obj.update(feature, (feature) => {
    const keys = Obj.getMeta(feature).keys;
    keys.splice(
      0,
      keys.length,
      ...keys.filter(({ source }) => source !== SPEC_KEY_SOURCE),
      ...sources.map((id) => ({ source: SPEC_KEY_SOURCE, id })),
    );
  });
};

/**
 * The requirements with an id for each that has none, numbered under the feature's block id after the highest given
 * (`F-3.4`); ids once given are kept, since text and code cite them.
 */
export const numberRequirements = (blockId: string, requirements: readonly Requirement[]): Requirement[] => {
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
