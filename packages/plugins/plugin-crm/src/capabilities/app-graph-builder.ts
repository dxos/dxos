//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths } from '@dxos/app-toolkit';
import { Annotation, Filter, Type } from '@dxos/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { type Space } from '@dxos/react-client/echo';
import { Organization, Person } from '@dxos/types';

import { meta } from '#meta';

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
        id: Paths.GroupSegments.crm,
        match: AppNodeMatcher.whenSpace,
        connector: (space) =>
          Effect.succeed([
            AppNode.makeGroup({
              id: Paths.GroupSegments.crm,
              type: Paths.GroupTypes.crm,
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
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.crm),
        connector: (space, get) =>
          Effect.succeed(
            CRM_TYPES.map((type) => createTypeNode({ type, space, get })).filter(
              (node): node is NonNullable<typeof node> => node !== null,
            ),
          ),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
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
  get: Atom.Context;
}): Node.NodeArg<Type.AnyEntity> | null => {
  const typename = Type.getTypename(type);
  const objects = get(space.db.query(Filter.type(Type.getURI(type))).atom);
  if (objects.length === 0) {
    return null;
  }

  // Prefer the registry copy of the schema: raw schema classes don't carry annotations reliably.
  const registered = space.db.graph.registry
    .list()
    .filter(Type.isType)
    .find((entry) => Type.getTypename(entry) === typename);
  const entity = registered ?? type;
  const annotation = Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(entity)));

  return Node.make({
    id: Paths.getTypeSlug(entity),
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
