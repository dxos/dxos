//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Filter, Obj, Ref, Registry, Type } from '@dxos/echo';
import * as RoutineOperation from '@dxos/plugin-routine/RoutineOperation';
import { type Space } from '@dxos/react-client/echo';
import { Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { meta } from '#meta';
import { CRM_SKILL_KEY } from '#skills';
import { CrmOperation } from '#types';

/** A node whose data is a researchable CRM object, tagged so the action can pick the right operation. */
type ResearchSubject =
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
      AppGraphBuilder.createExtension({
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
      AppGraphBuilder.createExtension({
        id: 'crmTypes',
        url: { key: 'crm', kind: 'item', path: [GraphPath.GroupSegments.crm] },
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.crm),
        connector: (space, get) =>
          Effect.succeed(
            CRM_TYPES.map((type) => createTypeNode({ type, space, get })).filter(
              (node): node is NonNullable<typeof node> => node !== null,
            ),
          ),
      }),

      // Research on the object's own node, so any surface showing a Person/Organization (the record
      // article's toolbar, the nav-tree context menu) offers it without depending on plugin-crm.
      AppGraphBuilder.createExtension({
        id: 'crmResearch',
        match: (node): Option.Option<ResearchSubject> => {
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
              id: 'research',
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
                  // The operations above only render the skeleton from what ECHO already knows —
                  // every section beyond Details is emitted empty on purpose. Filling them is the
                  // agent's job, which the CRM skill already instructs ("Enrich Profile documents in
                  // place…"), so the action runs both halves: skeleton first (instant, no model), then
                  // the agent against it.
                  //
                  // The subject rides along as a bound context object rather than a persisted
                  // `Instructions`, and `background` keeps the run in the process monitor instead of
                  // opening a chat. Images are the agent's too, via the skill's `attach-image` tool —
                  // `EnrichImages` is set-scoped (it walks everything missing an image) and would fire
                  // at objects the user never asked about.
                  yield* Operation.invoke(RoutineOperation.RunPromptInNewChat, {
                    db,
                    objects: [matched.subject],
                    skills: [CRM_SKILL_KEY],
                    background: true,
                    instructions: trim`
                      Research this ${matched.kind} and fill in its Profile document, which has just
                      been created with an empty Overview, Key Links, Notes and Sources.
                      Extend each section in place, record every contributing URL under Sources, and
                      attach an avatar or logo if research surfaces a good https candidate.
                      Do not invent facts you cannot source.
                    `,
                  });
                }),
              properties: {
                label: ['research.label', { ns: meta.profile.key }],
                icon: 'ph--sparkle--regular',
                disposition: ['toolbar', 'list-item'],
                presentation: { toolbar: { variant: 'primary', iconOnly: false } },
                testId: 'crm.record.research',
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
}: {
  type: Type.AnyEntity;
  space: Space;
  get: Atom.AtomContext;
}): AppGraphNode.NodeArg<Type.AnyEntity> | null => {
  const typename = Type.getTypename(type);
  const objects = get(space.db.query(Filter.type(Type.getURI(type))).atom);
  if (objects.length === 0) {
    return null;
  }

  // Raw schema classes don't carry annotations reliably, and schemas register lazily, so read
  // the registry copy through the atom.
  const entity = get(Registry.typeAtom(space.db.graph.registry, typename)) ?? type;
  const annotation = Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(entity)));

  return AppGraphNode.make({
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
