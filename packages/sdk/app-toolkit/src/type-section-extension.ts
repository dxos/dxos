//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { GraphBuilder, Node } from '@dxos/app-graph';
import { Annotation, Filter, Obj, Type } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';

import { whenSpace } from './app-node-matcher';
import { createObjectNode, getDynamicLabel } from './object-node';

/**
 * Creates a graph extension that surfaces all objects of an ECHO type under
 * each space as a dedicated sidebar section.
 *
 * The section id, type, plural label, and icon are all derived from the schema's
 * typename and annotations — no manual wiring needed. The section is suppressed
 * when the space has no matching objects.
 *
 * Usage:
 * ```ts
 * // In app-graph-builder.ts — one call per type:
 * createTypeSectionExtension(Chat.Chat)
 *
 * // Attach create/action extensions by matching on the typename:
 * GraphBuilder.createExtension({
 *   id: 'chatsSectionActions',
 *   match: (node) =>
 *     node.type === Type.getTypename(Chat.Chat) && isSpace(node.properties.space)
 *       ? Option.some(node.properties.space)
 *       : Option.none(),
 *   actions: (space) => Effect.succeed([...]),
 * })
 * ```
 *
 * @idiom org.dxos.app-toolkit.typeSection
 *   applies: Dedicated sidebar sections that list objects of a single ECHO type under a space
 *   instead-of: Only surfacing the type in plugin-space's generic database subtree, which buries it and reduces discoverability for the app user
 *   uses: {@link createTypeSectionExtension}, {@link AppNodeMatcher.whenSpace}, {@link AtomQuery}, {@link Filter.type}, {@link createObjectNode}
 */
export const createTypeSectionExtension = (
  type: Type.AnyEntity,
  options?: {
    /** Position hint for the section in the sidebar. */
    position?: 'first' | 'last';
  },
): Effect.Effect<GraphBuilder.BuilderExtension[], never, never> => {
  const typename = Type.getTypename(type);
  invariant(typename, 'Schema must have a typename to create a type section extension.');

  // Filter.type's overload constraint (UnknownTypeSchema) is not publicly exported;
  // the runtime accepts any schema with a typename annotation.
  const filter = Filter.type(type as any) as Filter.Any;

  const label = getDynamicLabel('typename.label', typename, { count: 2 });

  return GraphBuilder.createExtension({
    id: typename,
    match: whenSpace,
    connector: (space, get) => {
      const objects = get(AtomQuery.make(space.db, filter)) as Obj.Unknown[];
      if (objects.length === 0) {
        return Effect.succeed([]);
      }

      // Mirror createObjectNode: look up the registered Type.Type entity to read icon/hue.
      // Raw schema classes don't carry annotations reliably; the registry copy does.
      const typeEntity = space.db.graph.registry
        .list()
        .filter(Type.isType)
        .find((t) => Type.getTypename(t) === typename);
      const registeredSchema = typeEntity ? Type.getSchema(typeEntity) : undefined;
      const annotation = (() => {
        try {
          return registeredSchema ? Option.getOrUndefined(Annotation.IconAnnotation.get(registeredSchema)) : undefined;
        } catch {
          return undefined;
        }
      })();
      const icon = annotation?.icon ?? 'ph--circle-dashed--regular';
      const iconHue = annotation?.hue;

      return Effect.succeed([
        Node.make({
          id: typename,
          type: typename,
          data: `${typename}-root`,
          properties: {
            label,
            icon,
            ...(iconHue ? { iconHue } : {}),
            role: 'branch',
            space,
            ...(options?.position ? { position: options.position } : {}),
          },
          nodes: objects
            .map((object) => createObjectNode({ db: space.db, object }))
            .filter((node): node is NonNullable<typeof node> => node !== null),
        }),
      ]);
    },
  });
};
