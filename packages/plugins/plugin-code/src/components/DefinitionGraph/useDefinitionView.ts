//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type ReviewModel, reviewAnnotations, statusOf } from '@dxos/deus/review';
import { type SpecIndex } from '@dxos/deus/spec-index';

import { type DecisionModel, buildChangelogGraph } from '../ChangelogGraph/index.ts';
import {
  type DefinitionEdge,
  type SpecTexts,
  buildDefinitionGraph,
  diffDefinitionGraphs,
  groupDefinitions,
  specDeclarations,
} from '../SpecModel/index.ts';
import { DEFAULT_FACTS, type DefinitionFacts } from './definition-facts.ts';
import { type DefinitionViewModel } from './DefinitionChip.tsx';

export type DefinitionViewOptions = {
  /** The text of a `.mdl` spec; its `## Changelog` gives the decisions a block's view lists. */
  content: string;
  /** Other specs this one names by `github:` key, so their blocks can be described. */
  specs?: SpecTexts;
  /** Resolves `<spec id>#<item>` references to other specs' files; without it only `github:` keys name them. */
  index?: SpecIndex;
  /** The latest compliance review; its verdicts badge the blocks. */
  review?: ReviewModel;
  /** The base version of `content`; when given, each block is marked with what changed since it (diff mode). */
  base?: string;
  /** The dialects whose block types the spec is written in; those its frontmatter extends by default. */
  dialects?: readonly string[];
  /** The fields a card shows beside its kind, and how; a feature's status by default. */
  facts?: DefinitionFacts;
};

export type DefinitionView = {
  view: DefinitionViewModel;
  edges: readonly DefinitionEdge[];
  decisions: readonly DecisionModel[];
};

/** A spec's definitions grouped by what names them, with their verdicts, changes and facts, as the views draw them. */
export const useDefinitionView = ({
  content,
  specs,
  index,
  review,
  base,
  dialects,
  facts = DEFAULT_FACTS,
}: DefinitionViewOptions): DefinitionView => {
  const annotations = useMemo(() => reviewAnnotations(review), [review]);
  const factFields = useMemo(() => new Set(Object.keys(facts)), [facts]);
  const declarations = useMemo(() => specDeclarations(content, dialects), [content, dialects]);
  const current = useMemo(
    () => buildDefinitionGraph(content, { specs, annotations, index, declarations, factFields }),
    [content, specs, annotations, index, declarations, factFields],
  );
  const diff = useMemo(
    () =>
      base === undefined
        ? undefined
        : diffDefinitionGraphs(
            current,
            buildDefinitionGraph(base, { specs, annotations, index, declarations, factFields }),
            { current: content, base },
          ),
    [current, content, base, specs, annotations, index, declarations, factFields],
  );
  const full = diff ?? current;
  const grouping = useMemo(() => groupDefinitions(full), [full]);
  const decisions = useMemo(
    () => buildChangelogGraph(content).nodes.filter((node): node is DecisionModel => node.kind === 'decision'),
    [content],
  );
  const view = useMemo<DefinitionViewModel>(() => {
    const byId = new Map(full.definitions.map((definition) => [definition.id, definition]));
    return {
      byId,
      grouping,
      statusOf: (id) => statusOf(review, id),
      changeOf: (id) => diff?.changes.get(id),
      factsOf: (id) =>
        Object.entries(byId.get(id)?.facts ?? {}).map(([field, value]) => ({
          field,
          value,
          ...(facts[field]?.[value] && { style: facts[field][value] }),
        })),
    };
  }, [full, grouping, review, diff, facts]);
  return { view, edges: full.edges, decisions };
};
