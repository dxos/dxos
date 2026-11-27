//
// Copyright 2026 DXOS.org
//

//
// A tool's composite template: the id of the Object every shape that tool draws is an instance of. Derived from the
// kind rather than minted per drop, which is what gives one definition per tool per drawing — restyle any card and
// every card follows, while each one's text stays its own (`partOverrides`).
//
// Kept apart from the compiler (`viewport2d/template.ts`), which reads the DSL: the registry needs only the id, and a
// module that reads the DSL would pull the parser into every consumer of a node definition.
//

import { type NodeKind, type ViewId } from '@dxos/scene';

/** Marks a composite as a tool's, so the Objects panel can tell a template from one a person grouped. */
export const TEMPLATE_PREFIX = 'template:';

/** The composite a tool's shapes are instances of. */
export const templateCompositeId = (kind: NodeKind): ViewId => `${TEMPLATE_PREFIX}${kind}`;

/** The kind whose template this composite is, if it is one. */
export const templateType = (composite: ViewId): NodeKind | undefined =>
  composite.startsWith(TEMPLATE_PREFIX) ? composite.slice(TEMPLATE_PREFIX.length) : undefined;
