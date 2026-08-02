//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { AppAnnotation, DeckSpec } from '@dxos/app-toolkit';
import { Obj, Type } from '@dxos/echo';
import { type Node } from '@dxos/plugin-graph';

/**
 * The deck spec a node declares, from either place it can come from.
 *
 * `AppNode.makeObject` surfaces the type's annotation onto the node, but most plugins build their nodes
 * by hand with `Node.make` and never pass through it — the mailbox among them — so a spec declared on
 * the type would otherwise be invisible to the deck. Falling back to the node's own data means a type
 * declares its deck once and it holds however the node was built.
 */
export const resolveDeckSpec = (node: Node.Node | undefined): DeckSpec.DeckSpec | undefined => {
  const declared = DeckSpec.fromNode(node);
  if (declared) {
    return declared;
  }

  const type = Obj.isObject(node?.data) ? Obj.getType(node.data) : undefined;
  const schema = type && Type.getSchema(type);
  return schema ? Option.getOrUndefined(AppAnnotation.DeckAnnotation.get(schema)) : undefined;
};
