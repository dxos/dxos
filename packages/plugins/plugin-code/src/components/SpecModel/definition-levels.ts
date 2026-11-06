//
// Copyright 2026 DXOS.org
//

import { type DefinitionEdgeKind, type DefinitionModel, type DefinitionSelection } from './spec-model.ts';

/** The definitions under one `##` heading of a spec, or every block of other specs it names. */
export type SectionModel = {
  /** Node id; prefixed so a section never collides with a block id. */
  id: string;
  /** The heading; absent for blocks before the first one. */
  title?: string;
  /** Holds the blocks of other specs. */
  external: boolean;
  definitions: DefinitionModel[];
  /** How many definitions of each kind it holds, in order of first definition. */
  kinds: [kind: string, count: number][];
};

/** Where the definitions graph is opened: the whole spec, one section, or one definition and its neighbours. */
export type DefinitionFocus = { section?: string; definition?: string };

export type LevelNode =
  | { kind: 'section'; id: string; section: SectionModel }
  | { kind: 'definition'; id: string; definition: DefinitionModel };

export type LevelEdge = {
  id: string;
  from: string;
  to: string;
  kind: DefinitionEdgeKind;
  /** The field that holds a reference between two definitions. */
  field?: string;
};

export type DefinitionLevel = {
  nodes: LevelNode[];
  edges: LevelEdge[];
  /** Neighbours of the focused definition left out past the limit. */
  hidden: number;
};

export type DefinitionLevelOptions = {
  /** At most this many neighbours are drawn around a focused definition. */
  neighbours?: number;
};

export const SECTION_PREFIX = 'section:';

/** The section of the blocks of other specs. */
export const EXTERNAL_SECTION_ID = `${SECTION_PREFIX}external`;

const sectionIdOf = (definition: DefinitionModel): string =>
  definition.external ? EXTERNAL_SECTION_ID : `${SECTION_PREFIX}${definition.section ?? ''}`;

/** The spec's sections in the order they appear, then the blocks of other specs. */
export const sectionsOf = ({ definitions }: DefinitionSelection): SectionModel[] => {
  const sections = new Map<string, SectionModel>();
  for (const definition of definitions) {
    const id = sectionIdOf(definition);
    const section = sections.get(id) ?? {
      id,
      title: definition.external ? undefined : definition.section,
      external: Boolean(definition.external),
      definitions: [],
      kinds: [],
    };
    section.definitions.push(definition);
    sections.set(id, section);
  }
  for (const section of sections.values()) {
    const counts = new Map<string, number>();
    section.definitions.forEach(({ kind }) => counts.set(kind, (counts.get(kind) ?? 0) + 1));
    section.kinds = [...counts];
  }
  const all = [...sections.values()];
  return [...all.filter(({ external }) => !external), ...all.filter(({ external }) => external)];
};

/** How many references each definition makes into each section, its own included, by section id. */
export const referencesBySection = (
  model: DefinitionSelection,
  sections: readonly SectionModel[],
): Map<string, Map<string, number>> => {
  const sectionOf = new Map(
    sections.flatMap(({ id, definitions }) => definitions.map((definition) => [definition.id, id])),
  );
  const counts = new Map<string, Map<string, number>>();
  for (const { from, to } of model.edges) {
    const target = sectionOf.get(to);
    if (target && from !== to) {
      const row = counts.get(from) ?? new Map<string, number>();
      row.set(target, (row.get(target) ?? 0) + 1);
      counts.set(from, row);
    }
  }
  return counts;
};

/**
 * The cards of one level of the definitions graph. The whole spec is a card per section of its own, and a section is a
 * card per definition; neither draws arrows, so references are counts on the cards ({@link referencesBySection}). A
 * definition is drawn with the definitions it references and those that reference it, with an arrow for each.
 */
export const levelOf = (
  model: DefinitionSelection,
  sections: readonly SectionModel[],
  focus: DefinitionFocus,
  { neighbours = 12 }: DefinitionLevelOptions = {},
): DefinitionLevel => {
  const focused = focus.definition ? model.byId.get(focus.definition) : undefined;
  if (focused) {
    const references = focused.dependsOn.filter((id) => id !== focused.id);
    const dependents = model.edges
      .filter(({ to, from }) => to === focused.id && from !== focused.id)
      .map(({ from }) => from);
    const around = [...new Set([...references, ...dependents])];
    const shown = new Set([focused.id, ...around.slice(0, neighbours)]);
    return {
      nodes: [...shown].flatMap((id) => {
        const definition = model.byId.get(id);
        return definition ? [{ kind: 'definition' as const, id, definition }] : [];
      }),
      edges: model.edges
        .filter(({ from, to }) => shown.has(from) && shown.has(to) && (from === focused.id || to === focused.id))
        .map(({ id, from, to, kind, field }) => ({ id, from, to, kind, ...(field && { field }) })),
      hidden: Math.max(0, around.length - neighbours),
    };
  }

  const section = focus.section ? sections.find(({ id }) => id === focus.section) : undefined;
  if (section) {
    return {
      nodes: section.definitions.map((definition) => ({ kind: 'definition', id: definition.id, definition })),
      edges: [],
      hidden: 0,
    };
  }

  return {
    nodes: sections
      .filter(({ external }) => !external)
      .map((section) => ({ kind: 'section', id: section.id, section })),
    edges: [],
    hidden: 0,
  };
};
