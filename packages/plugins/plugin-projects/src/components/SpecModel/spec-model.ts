//
// Copyright 2026 DXOS.org
//

import { type Relationship, type Role } from '@dxos/deus/dialect';
import { type MdlBlock, findSpecRefs, parseMdlBlocks, specReferenceFilter } from '@dxos/deus/extension';
import {
  type Annotation,
  type SourceKey,
  findSourceKeys,
  formatSourceKey,
  isSpecKey,
  parseFields,
} from '@dxos/deus/review';
import { type SpecIndex } from '@dxos/deus/spec-index';

import { type Declarations, type DefinitionRelation, relationOf, specDeclarations } from './declarations.ts';
import { type KindStyle, kindStyle, styleOf } from './kinds.ts';
import { resolveSpecRef } from './spec-ref.ts';

/** A top-level spec block that other blocks can depend on. */
export type DefinitionModel = {
  id: string;
  kind: string;
  /** Its type's declared role; `structure` when undeclared, and `context` for a block outside the spec. */
  role: Role;
  /** Its type's declared icon and hue. */
  style: KindStyle;
  title?: string;
  /** The `##` heading the block sits under; absent before the first one and on external nodes. */
  section?: string;
  /** Ids this definition references through a linked field or a key, in order of first reference. */
  dependsOn: string[];
  /** How many code symbols the review links it (or its requirements) to. */
  codeRefs: number;
  /** How many `req` lines a feature holds. */
  requirements: number;
  /** The one-line values of its fact fields, by field: a feature's `status: operational`. */
  facts?: Record<string, string>;
  /** Set on a node that lives outside this spec: a block of another spec. */
  external?: ExternalModel;
};

/** How one definition reaches another: a linked field, or a `github:` key or spec reference. */
export type DefinitionEdgeKind = 'reference' | 'external';

export type DefinitionEdge = {
  id: string;
  from: string;
  to: string;
  kind: DefinitionEdgeKind;
  /** The field that holds a reference. */
  field?: string;
  /** How the field or key relates its ends. */
  relation: DefinitionRelation;
};

/** Where an external node comes from; its id is the `github:` key itself. */
export type ExternalModel = {
  target: 'spec' | 'code';
  key: SourceKey;
  /** The block or symbol named; absent for a key that names a whole file. */
  fragment?: string;
  /** Whether the other spec's text was available to describe the block. */
  resolved: boolean;
};

/** The texts of other specs, keyed by their `github:` key without a fragment. */
export type SpecTexts = ReadonlyMap<string, string>;

/** The definitions of a spec and which reach which, pointing from the dependent to what it names. */
export type DefinitionGraphModel = {
  definitions: DefinitionModel[];
  edges: DefinitionEdge[];
};

/** Kinds that describe the spec's own history or language rather than the system it specifies. */
const NON_DEFINITION_KINDS = new Set(['decision', 'ext']);

/** Dotted identifiers, so `CallsCapabilities.Manager` and `F-1.2` each read as one token. */
const IDENTIFIER = /[A-Za-z][\w-]*(?:\.[\w-]+)*/g;

/** The spec's blocks that define something, as opposed to recording its history or extending its language. */
export const definitionBlocks = (text: string): MdlBlock[] =>
  parseMdlBlocks(text).filter(({ type, id }) => id && !NON_DEFINITION_KINDS.has(type));

/** The id a token names: itself, or the nearest enclosing id (`F-1.2` names `F-1`; `Meeting.call` names `Meeting`). */
const resolveToken = (token: string, ids: ReadonlySet<string>): string | undefined => {
  for (let candidate = token; candidate; candidate = candidate.slice(0, Math.max(candidate.lastIndexOf('.'), 0))) {
    if (ids.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

/** The ids of `ids` that `text` names, other than `self`. */
export const namedIds = (text: string, ids: ReadonlySet<string>, self?: string): string[] => [
  ...new Set(
    [...text.matchAll(IDENTIFIER)]
      .map(([token]) => resolveToken(token, ids))
      .filter((id): id is string => id !== undefined && id !== self),
  ),
];

/**
 * The node a spec key names: that block of the other spec, described from its text when `specs` has it, or one node
 * for the whole file.
 */
const externalDefinition = (key: SourceKey, specs: SpecTexts): DefinitionModel => {
  const text = specs.get(formatSourceKey(key, false));
  const blocks = text ? definitionBlocks(text) : [];
  const owner = key.fragment ? resolveToken(key.fragment, new Set(blocks.map((block) => block.id))) : undefined;
  const block = blocks.find((candidate) => candidate.id === owner);
  return {
    id: formatSourceKey(key),
    kind: block?.type ?? 'spec',
    role: 'context',
    style: kindStyle(block?.type ?? 'spec'),
    title: block?.title ?? key.fragment ?? key.path,
    dependsOn: [],
    codeRefs: 0,
    requirements: 0,
    external: { target: 'spec', key, ...(key.fragment && { fragment: key.fragment }), resolved: block !== undefined },
  };
};

export type BuildDefinitionGraphOptions = {
  /** Other specs this one names by `github:` key, so their blocks can be described. */
  specs?: SpecTexts;
  /** A review's links from items to code, counted on the cards. */
  annotations?: readonly Annotation[];
  /** Resolves `<spec id>#<item>` references to other specs' files. */
  index?: SpecIndex;
  /** Each block type's role and links; those of the spec's dialects when unset (see {@link specDeclarations}). */
  declarations?: Declarations;
  /** The fields whose one-line value is kept on the definition as a fact; none when unset. */
  factFields?: ReadonlySet<string>;
};

/** The `##` heading in force at each offset of `text`, as sorted offsets and titles. */
const sectionsOf = (text: string): { from: number; title: string }[] =>
  [...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => ({ from: match.index ?? 0, title: match[1] }));

const sectionAt = (sections: readonly { from: number; title: string }[], offset: number): string | undefined =>
  sections.findLast(({ from }) => from < offset)?.title;

/** A value written as a reference (`Ref<X>`, `Ref(X)`), which points at X without holding it. */
const REF_VALUE = /\bRef\s*[<(]\s*([A-Za-z][\w.-]*)/g;

/**
 * Every definition of a spec with an edge to each block a linked field of it names, as its type's links relate them,
 * and to each block of another spec it names (by `<spec id>#<item>` resolved through `index`, or by `github:` key). A
 * link read from the other end is turned round, so a part's `part-of` is its whole's `composes`. A name in a field with
 * no link, or in prose, is not an edge, and code symbols a review links to it are counted rather than drawn.
 */
export const buildDefinitionGraph = (
  text: string,
  {
    specs = new Map(),
    annotations = [],
    index,
    declarations = specDeclarations(text),
    factFields = new Set(),
  }: BuildDefinitionGraphOptions = {},
): DefinitionGraphModel => {
  const isReference = index ? specReferenceFilter(index) : () => false;
  const blocks = definitionBlocks(text);
  const ids = new Set(blocks.map(({ id }) => id));
  const sections = sectionsOf(text);
  const externals = new Map<string, DefinitionModel>();
  const link = (key: SourceKey): string | undefined => {
    if (!isSpecKey(key)) {
      return undefined;
    }
    const external = externals.get(formatSourceKey(key)) ?? externalDefinition(key, specs);
    externals.set(external.id, external);
    return external.id;
  };
  // A requirement's code links count on its feature, the card the graph draws.
  const codeRefs = new Map<string, number>();
  for (const { id, keys } of annotations) {
    const owner = resolveToken(id, ids);
    const code = keys.filter((key) => !isSpecKey(key)).length;
    owner && code > 0 && codeRefs.set(owner, (codeRefs.get(owner) ?? 0) + code);
  }
  const edges: DefinitionEdge[] = [];
  const edgeIds = new Set<string>();
  const definitions = blocks.map(({ type, id, title, body, from }): DefinitionModel => {
    const prose = `${title ?? ''}\n${body}`;
    const refs = findSpecRefs(prose).filter((ref) => isReference(ref.id));
    const refKeys = refs.flatMap((ref) => {
      const resolved = index && resolveSpecRef(index, ref.id, ref.item);
      return resolved && !('error' in resolved) ? [resolved] : [];
    });
    const targets = new Set<string>();
    const add = (to: string, kind: DefinitionEdgeKind, relationship: Relationship, field?: string) => {
      if (to === id || targets.has(to)) {
        return;
      }
      targets.add(to);
      const { relation, reversed } = relationOf(relationship);
      const [from, target] = reversed ? [to, id] : [id, to];
      const edgeId = `${from}->${target}`;
      if (!edgeIds.has(edgeId)) {
        edgeIds.add(edgeId);
        edges.push({ id: edgeId, from, to: target, kind, relation, ...(field && { field }) });
      }
    };
    const links = declarations.get(type)?.links ?? {};
    const facts: Record<string, string> = {};
    for (const [field, value] of parseFields(body)) {
      const fact = factFields.has(field) ? value.inline?.replace(/\s+#.*$/, '').trim() : undefined;
      fact && (facts[field] = fact);
      const relationship = links[field];
      if (relationship) {
        const values = [value.inline ?? '', ...value.lines].join('\n').replace(SOURCE_KEYS, ' ');
        if (relationship === 'composes' || relationship === 'aggregates') {
          const refs = [...values.matchAll(REF_VALUE)].map(([, name]) => name).join(' ');
          namedIds(refs, ids, id).forEach((to) => add(to, 'reference', 'references', field));
        }
        namedIds(values, ids, id).forEach((to) => add(to, 'reference', relationship, field));
      }
    }
    [...findSourceKeys(prose).map(({ key }) => key), ...refKeys].forEach((key) => {
      const to = link(key);
      to && add(to, 'external', 'references');
    });
    const section = sectionAt(sections, from);
    return {
      id,
      kind: type,
      role: declarations.get(type)?.role ?? 'structure',
      style: styleOf(declarations.get(type)),
      ...(title && { title }),
      ...(section && { section }),
      dependsOn: [...targets],
      codeRefs: codeRefs.get(id) ?? 0,
      requirements: type === 'feat' ? body.split('\n').filter((line) => /^\s*req\s/.test(line)).length : 0,
      ...(Object.keys(facts).length > 0 && { facts }),
    };
  });
  return { definitions: [...definitions, ...externals.values()], edges };
};

const SOURCE_KEYS = /github:\S+/g;

/** A definition graph narrowed to the kinds still shown, with lookups for drawing it. */
export type DefinitionSelection = DefinitionGraphModel & {
  byId: ReadonlyMap<string, DefinitionModel>;
  /** How many shown definitions name each one. */
  dependents: ReadonlyMap<string, number>;
  /** The kinds present, in order of first definition. */
  kinds: string[];
};

/** Drops the given kinds, and every edge to or from them, from a definition graph. */
export const selectDefinitions = (
  { definitions, edges }: DefinitionGraphModel,
  exclude: Iterable<string>,
): DefinitionSelection => {
  const excluded = new Set(exclude);
  const keptIds = new Set(definitions.filter(({ kind }) => !excluded.has(kind)).map(({ id }) => id));
  // Narrowed too, so a card's "uses" count matches the arrows drawn.
  const kept = definitions
    .filter(({ id }) => keptIds.has(id))
    .map((definition) => ({ ...definition, dependsOn: definition.dependsOn.filter((id) => keptIds.has(id)) }));
  const byId = new Map(kept.map((definition) => [definition.id, definition]));
  const keptEdges = edges.filter(({ from, to }) => byId.has(from) && byId.has(to));
  const dependents = new Map<string, number>();
  keptEdges.forEach(({ to }) => dependents.set(to, (dependents.get(to) ?? 0) + 1));
  return {
    definitions: kept,
    edges: keptEdges,
    byId,
    dependents,
    kinds: [...new Set(kept.map(({ kind }) => kind))],
  };
};
