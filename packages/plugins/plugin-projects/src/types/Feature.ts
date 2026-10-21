//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Project from '@dxos/compute/Project';
import { Annotation, DXN, Format, Obj, Ref, Relation, Type } from '@dxos/echo';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { Task } from '@dxos/types';

//
// Status
//

/** Where the feature is now; authored by whoever knows, never derived. */
export const Status = Schema.Literals(['planned', 'in-progress', 'prototype', 'operational', 'failing']);
export type Status = Schema.Schema.Type<typeof Status>;

export const StatusOptions: Task.Option<Status>[] = [
  { id: 'planned', title: 'Planned', color: 'neutral', icon: 'ph--circle-dashed--regular' },
  { id: 'in-progress', title: 'In progress', color: 'sky', icon: 'ph--circle-half--regular' },
  { id: 'prototype', title: 'Prototype', color: 'amber', icon: 'ph--flask--regular' },
  { id: 'operational', title: 'Operational', color: 'emerald', icon: 'ph--seal-check--regular' },
  { id: 'failing', title: 'Failing', color: 'rose', icon: 'ph--warning-octagon--regular' },
];

//
// Feature
//

/** Where a feature's card sits on its project's canvas. */
export const Position = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Position = Schema.Schema.Type<typeof Position>;

/** A part of a feature with its own status; specs, dependencies and tasks belong to the feature. */
export const Subfeature = Schema.Struct({
  name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),
  status: Status.pipe(Schema.annotate({ title: 'Status' })),
});
export type Subfeature = Schema.Schema.Type<typeof Subfeature>;

/**
 * A goal state: something the product should do. Authored in ECHO; the repo specs that describe how
 * it is met stay in git and are referenced by path.
 */
export class Feature extends Type.makeObject<Feature>(DXN.make('org.dxos.type.feature', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),

    description: Schema.optional(
      Schema.String.pipe(
        Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
        Schema.annotate({ title: 'Description' }),
      ),
    ),

    status: Status.pipe(
      Format.FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      Schema.annotate({
        title: 'Status',
        [PropertyMetaAnnotationId]: { singleSelect: { options: StatusOptions } },
      }),
    ),

    /** Repo paths of the specs that describe this feature, e.g. `packages/plugins/plugin-inbox/PLUGIN.mdl#F-3`. */
    specs: Schema.optional(Schema.Array(Schema.String).pipe(Schema.annotate({ title: 'Specs' }))),

    /**
     * The parts this feature breaks down into, in display order. Records rather than features: the map is
     * two levels deep, a part has a status but no specs, dependencies or tasks of its own.
     */
    subfeatures: Schema.optional(Schema.Array(Subfeature).pipe(Schema.annotate({ title: 'Subfeatures' }))),

    /**
     * The project whose feature board lists this feature. Held by the feature rather than the project, since a
     * project is a generic compute type that knows nothing of features; not owned, so deleting a project keeps it.
     */
    project: Schema.optional(Ref.Ref(Project.Project).pipe(Annotation.FormInputAnnotation.set(false))),

    /** Where the user dragged the card on its project's canvas; a feature without one is laid out automatically. */
    position: Schema.optional(Position.pipe(Annotation.FormInputAnnotation.set(false))),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--puzzle-piece--regular', hue: 'violet' }),
    Annotation.UserType.set(),
  ),
) {}

/** `subfeatures` starts as an empty list so two peers lazily creating it cannot each write a fresh one. */
export const make = (props: Obj.MakeProps<typeof Feature>): Feature => Obj.make(Feature, { subfeatures: [], ...props });

export const instanceOf = (value: unknown): value is Feature => Obj.instanceOf(Feature, value);

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

/** Repository that relative spec paths resolve against. */
export const DEFAULT_SPEC_REPOSITORY = 'https://github.com/dxos/dxos';

/**
 * Where a spec opens on GitHub: a URL is kept; a repo path (`packages/…/PLUGIN.mdl#F-3`) opens its file on the
 * default branch, without the block anchor, which GitHub cannot resolve inside an `.mdl` file.
 */
export const getSpecUrl = (spec: string, repository = DEFAULT_SPEC_REPOSITORY): string =>
  /^https?:\/\//.test(spec) ? spec : `${repository}/blob/main/${getSpecPath(spec)}`;

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
