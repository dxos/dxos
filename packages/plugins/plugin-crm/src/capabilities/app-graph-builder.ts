//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphBuilder from '@dxos/app-graph/GraphBuilder';
import * as Node from '@dxos/app-graph/Node';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Filter, Obj, Ref, Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Organization, Person } from '@dxos/types';

import { meta } from '#meta';
import { CrmOperation } from '#types';

/** A node whose data is an enrichable CRM object, tagged so the action can pick the right operation. */
type EnrichSubject =
  | { kind: 'person'; subject: Person.Person }
  | { kind: 'organization'; subject: Organization.Organization };

/** Node type for a CRM type-collection node (data is the ECHO Type). */
const CRM_TYPE_NODE = `${meta.profile.key}/type-node`;

/** Types surfaced as top-level nodes under the CRM group, in display order. */
const CRM_TYPES: Type.AnyEntity[] = [Organization.Organization, Person.Person];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // CRM section group — created here so it only appears when the CRM plugin is active and
      // hides when it has no children (i.e. the space has no organizations or people).
      GraphBuilder.createExtension({
        id: GraphPath.GroupSegments.crm,
        match: AppNodeMatcher.whenSpace,
        connector: (space) =>
          Effect.succeed([
            AppNode.makeGroup({
              id: GraphPath.GroupSegments.crm,
              type: GraphPath.GroupTypes.crm,
              label: ['nav-tree-group-crm.label', { ns: meta.profile.key }],
              space,
              position: 500,
            }),
          ]),
      }),

      // Type-collection nodes under the CRM group. Each node opens the generic collection article
      // (see react-surface). A type is shown only when the space has objects of it, mirroring the
      // natural type folders under the Database section.
      GraphBuilder.createExtension({
        id: 'crmTypes',
        url: { key: 'crm', kind: 'item', path: [GraphPath.GroupSegments.crm] },
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.crm),
        connector: (space, get) => {
          // Index the registry once per rebuild so each type resolves its registered schema in O(1).
          const registered = new Map(
            space.db.graph.registry
              .list()
              .filter(Type.isType)
              .map((entry) => [Type.getTypename(entry), entry] as const),
          );
          return Effect.succeed(
            CRM_TYPES.map((type) => createTypeNode({ type, space, get, registered })).filter(
              (node): node is NonNullable<typeof node> => node !== null,
            ),
          );
        },
      }),

      // Enrichment on the object's own node, so any surface showing a Person/Organization (the record
      // article's toolbar, the nav-tree context menu) offers it without depending on plugin-crm.
      GraphBuilder.createExtension({
        id: 'crmEnrich',
        match: (node): Option.Option<EnrichSubject> => {
          if (Obj.instanceOf(Person.Person, node.data)) {
            return Option.some({ kind: 'person', subject: node.data });
          }
          if (Obj.instanceOf(Organization.Organization, node.data)) {
            return Option.some({ kind: 'organization', subject: node.data });
          }
          return Option.none();
        },
        actions: (matched) => {
          const db = Obj.getDatabase(matched.subject);
          if (!db) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'enrich',
              // Scheduled, not invoked: research is a long run, and the pair is sequenced so the image
              // pass sees whatever the profile step just wrote.
              data: () =>
                Effect.gen(function* () {
                  // Branched rather than parameterised: the two operations take differently-typed
                  // subject refs, and collapsing them would mean widening one of the inputs.
                  if (matched.kind === 'person') {
                    yield* Operation.schedule(
                      CrmOperation.ResearchPerson,
                      { subject: Ref.make(matched.subject) },
                      { spaceId: db.spaceId },
                    );
                  } else {
                    yield* Operation.schedule(
                      CrmOperation.ResearchOrganization,
                      { subject: Ref.make(matched.subject) },
                      { spaceId: db.spaceId },
                    );
                  }
                  // Set-scoped rather than subject-scoped (it walks everything missing an image), so it
                  // is bounded by `limit` instead of targeting this object. A subject-scoped variant
                  // would be the cleaner call here — see TASKS.md.
                  yield* Operation.schedule(CrmOperation.EnrichImages, { limit: 8 }, { spaceId: db.spaceId });
                }),
              properties: {
                label: ['enrich.label', { ns: meta.profile.key }],
                icon: 'ph--sparkle--regular',
                disposition: ['toolbar', 'list-item'],
                presentation: { toolbar: { variant: 'primary', iconOnly: false } },
                testId: 'crm.record.enrich',
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);

/** Builds a plain selectable node for a CRM type, or null when the space has no such objects. */
const createTypeNode = ({
  type,
  space,
  get,
  registered,
}: {
  type: Type.AnyEntity;
  space: Space;
  get: Atom.AtomContext;
  registered: ReadonlyMap<string, Type.AnyEntity>;
}): Node.NodeArg<Type.AnyEntity> | null => {
  const typename = Type.getTypename(type);
  const objects = get(space.db.query(Filter.type(Type.getURI(type))).atom);
  if (objects.length === 0) {
    return null;
  }

  // Prefer the registry copy of the schema: raw schema classes don't carry annotations reliably.
  const entity = registered.get(typename) ?? type;
  const annotation = Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(entity)));

  return Node.make({
    id: GraphPath.getTypeSlug(entity),
    type: CRM_TYPE_NODE,
    data: entity,
    properties: {
      label: AppNode.getDynamicLabel('typename.label', typename, { count: 2, defaultValue: typename }),
      icon: annotation?.icon ?? 'ph--circle-dashed--regular',
      ...(annotation?.hue ? { iconHue: annotation.hue } : {}),
      selectable: true,
      draggable: false,
      droppable: false,
      childrenDroppable: false,
      space,
      testId: `crmPlugin.typeNode.${typename}`,
    },
  });
};
