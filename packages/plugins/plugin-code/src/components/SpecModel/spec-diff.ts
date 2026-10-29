//
// Copyright 2026 DXOS.org
//

import { parseMdlBlocks } from '@dxos/deus/extension';

import { type DefinitionGraphModel } from './spec-model.ts';

/** How a definition or an arrow differs from the base version of its spec. */
export type ChangeKind = 'added' | 'removed' | 'changed';

/** A definition graph that also holds what the base had and this version dropped, with each change marked. */
export type DefinitionDiffModel = DefinitionGraphModel & {
  /** Keyed by definition id; an unchanged definition has no entry. */
  changes: ReadonlyMap<string, ChangeKind>;
  /** Keyed by edge id; only `added` and `removed` apply to an arrow. */
  edgeChanges: ReadonlyMap<string, Exclude<ChangeKind, 'changed'>>;
};

/** Each block's text with whitespace runs folded, so re-wrapping a paragraph does not count as a change. */
const blockTexts = (text: string): Map<string, string> =>
  new Map(
    parseMdlBlocks(text)
      .filter(({ id }) => id)
      .map(({ type, id, title, body }) => [id, `${type} ${title ?? ''}\n${body}`.replace(/\s+/g, ' ').trim()]),
  );

/**
 * `current` with the definitions and arrows only `base` has put back, so a reviewer sees what a change removed in
 * place. A definition in both whose block text differs is `changed`; an external node (another spec's block or a code
 * symbol) has no text here, so it is only ever added or removed.
 */
export const diffDefinitionGraphs = (
  current: DefinitionGraphModel,
  base: DefinitionGraphModel,
  texts: { current: string; base: string },
): DefinitionDiffModel => {
  const currentIds = new Set(current.definitions.map(({ id }) => id));
  const baseIds = new Set(base.definitions.map(({ id }) => id));
  const currentTexts = blockTexts(texts.current);
  const baseTexts = blockTexts(texts.base);

  const changes = new Map<string, ChangeKind>();
  for (const { id } of current.definitions) {
    if (!baseIds.has(id)) {
      changes.set(id, 'added');
    } else if (currentTexts.get(id) !== baseTexts.get(id)) {
      changes.set(id, 'changed');
    }
  }
  const removed = base.definitions.filter(({ id }) => !currentIds.has(id));
  removed.forEach(({ id }) => changes.set(id, 'removed'));

  const currentEdges = new Set(current.edges.map(({ id }) => id));
  const baseEdges = new Set(base.edges.map(({ id }) => id));
  const edgeChanges = new Map<string, Exclude<ChangeKind, 'changed'>>();
  current.edges.filter(({ id }) => !baseEdges.has(id)).forEach(({ id }) => edgeChanges.set(id, 'added'));
  const removedEdges = base.edges.filter(({ id }) => !currentEdges.has(id));
  removedEdges.forEach(({ id }) => edgeChanges.set(id, 'removed'));

  return {
    definitions: [...current.definitions, ...removed],
    edges: [...current.edges, ...removedEdges],
    changes,
    edgeChanges,
  };
};
