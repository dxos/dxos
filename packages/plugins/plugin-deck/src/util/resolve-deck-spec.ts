//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as DeckSpec from '@dxos/app-toolkit/DeckSpec';
import { Obj, Type } from '@dxos/echo';

/**
 * The deck spec a node declares, from either place it can come from.
 *
 * `AppNode.makeObject` surfaces the type's annotation onto the node, but most plugins build their nodes
 * by hand with `AppGraphNode.make` and never pass through it — the mailbox among them — so a spec declared on
 * the type would otherwise be invisible to the deck. Falling back to the node's own data means a type
 * declares its deck once and it holds however the node was built.
 */
export const resolveDeckSpec = (node: AppGraphNode.Node | undefined): DeckSpec.DeckSpec | undefined => {
  const declared = DeckSpec.fromNode(node);
  if (declared) {
    return declared;
  }

  const type = Obj.isObject(node?.data) ? Obj.getType(node.data) : undefined;
  const schema = type && Type.getSchema(type);
  return schema ? Option.getOrUndefined(AppAnnotation.DeckAnnotation.get(schema)) : undefined;
};
