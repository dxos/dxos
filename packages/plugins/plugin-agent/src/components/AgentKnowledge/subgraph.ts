//
// Copyright 2026 DXOS.org
//

import { RDF } from '@dxos/pipeline-rdf';

/** One value of a property: an entity is a chip that links to its own card, a literal is text. */
export type EntityCardValue =
  | { kind: 'entity'; id: string; label: string; /** The entity's class, which colours its chip. */ type?: string }
  | { kind: 'literal'; label: string };

export type EntityCardProperty = {
  /** The normalized predicate, so a property can be keyed and an inverse looked up. */
  predicate: string;
  label: string;
  values: EntityCardValue[];
};

export type EntityCardModel = {
  id: string;
  label: string;
  /** The entity's class, for the header; undefined when nothing states it. */
  type?: string;
  /** Statements with this entity as subject. */
  properties: EntityCardProperty[];
  /** Statements with this entity as object, labelled by the predicate's inverse. */
  inverse: EntityCardProperty[];
};

export type EntityCardOptions = {
  /** Classes by entity id; otherwise the class the facts state for the entity (its term's `type`), if any. */
  types?: Readonly<Record<string, string>>;
  /** Labels by normalized predicate; the predicate as said otherwise. */
  labels?: Readonly<Record<string, string>>;
  /** Inverse labels by normalized predicate (`knows` -> `known-by`); `<label>-of` otherwise. Labels are `Predicate.label`. */
  inverses?: Readonly<Record<string, string>>;
  /** Also give a card to entities that are only ever objects (an employer, a paper), as browsing needs. */
  objects?: boolean;
};

/** Display classes for the kinds the extractor assigns, so stated types read like the ones a caller names. */
const KIND_TYPES: Readonly<Record<RDF.EntityKind, string>> = {
  person: 'Person',
  org: 'Organization',
  place: 'Place',
  event: 'Event',
  concept: 'Concept',
  thing: 'Thing',
};

/** Classes by entity id: the caller's first, then the first type the facts state for each entity. */
const typesOf = (facts: readonly RDF.Fact[], types: EntityCardOptions['types']): Map<string, string> => {
  const result = new Map(Object.entries(types ?? {}));
  for (const { assertion } of facts) {
    for (const term of [assertion.subject, assertion.object]) {
      if (term.kind === 'entity' && term.type && !result.has(term.entity)) {
        result.set(term.entity, KIND_TYPES[term.type]);
      }
    }
  }
  return result;
};

const valueOf = (term: RDF.Term, types: ReadonlyMap<string, string>): EntityCardValue =>
  term.kind === 'entity'
    ? { kind: 'entity', id: term.entity, label: term.label ?? term.entity, type: types.get(term.entity) }
    : { kind: 'literal', label: term.literal };

/** Appends `value` to the property for `predicate`, in first-seen order, without repeating a value. */
const add = (
  properties: Map<string, EntityCardProperty>,
  predicate: string,
  label: string,
  value: EntityCardValue,
): void => {
  const property = properties.get(predicate) ?? { predicate, label, values: [] };
  const key = value.kind === 'entity' ? value.id : value.label;
  if (!property.values.some((existing) => (existing.kind === 'entity' ? existing.id : existing.label) === key)) {
    property.values.push(value);
  }
  properties.set(predicate, property);
};

/**
 * One card per entity that is the subject of a fact, in first-seen order: its outgoing statements grouped by predicate,
 * and the statements that point at it grouped under the predicate's inverse.
 */
export const toEntityCards = (facts: readonly RDF.Fact[], options: EntityCardOptions = {}): EntityCardModel[] => {
  const cards = new Map<
    string,
    { label: string; properties: Map<string, EntityCardProperty>; inverse: Map<string, EntityCardProperty> }
  >();
  const card = (id: string, label: string | undefined) => {
    const existing = cards.get(id);
    if (existing) {
      return existing;
    }
    const created = { label: label ?? id, properties: new Map(), inverse: new Map() };
    cards.set(id, created);
    return created;
  };
  const types = typesOf(facts, options.types);

  for (const { assertion } of facts) {
    if (assertion.subject.kind !== 'entity') {
      continue;
    }
    const predicate = RDF.Predicate.normalize(assertion.predicate);
    const label = RDF.Predicate.label(options.labels?.[predicate] ?? assertion.predicate);
    const subject = card(assertion.subject.entity, assertion.subject.label);
    add(subject.properties, predicate, label, valueOf(assertion.object, types));

    if (assertion.object.kind === 'entity') {
      // Collected for every object; without `objects`, an object gets a card only if it is also a subject.
      const inverseLabel = RDF.Predicate.label(options.inverses?.[predicate] ?? `${label}-of`);
      add(
        card(assertion.object.entity, assertion.object.label).inverse,
        predicate,
        inverseLabel,
        valueOf(assertion.subject, types),
      );
    }
  }

  const subjects = new Set(
    facts.flatMap(({ assertion }) => (assertion.subject.kind === 'entity' ? [assertion.subject.entity] : [])),
  );
  return [...cards]
    .filter(([id]) => options.objects || subjects.has(id))
    .map(([id, { label, properties, inverse }]) => ({
      id,
      label,
      type: types.get(id),
      properties: [...properties.values()],
      inverse: [...inverse.values()],
    }));
};

/** Identifies a property row across both directions: `out:<predicate>` or `in:<predicate>`. */
export const propertyKey = (direction: 'out' | 'in', predicate: string): string => `${direction}:${predicate}`;

/** What a column of the entity browser has chosen: a card, and within it optionally a property row or one chip. */
export type BrowseSelection = {
  cardId: string;
  /** A {@link propertyKey}. */
  property?: string;
  /** One entity named by a chip. */
  entity?: string;
};

/**
 * The ids the next column shows for a selection: the chip's entity, else the property's entity values, else every
 * entity the card relates to in either direction - in order, without repeats.
 */
export const related = (card: EntityCardModel, selection: BrowseSelection): string[] => {
  if (selection.entity) {
    return [selection.entity];
  }
  const rows = [
    ...card.properties.map((property) => ({ key: propertyKey('out', property.predicate), property })),
    ...card.inverse.map((property) => ({ key: propertyKey('in', property.predicate), property })),
  ].filter(({ key }) => !selection.property || key === selection.property);
  const ids = rows.flatMap(({ property }) =>
    property.values.flatMap((value) => (value.kind === 'entity' ? [value.id] : [])),
  );
  return [...new Set(ids)];
};

/** The text values (a memory's claims) of the property a selection chose, which the next column shows as statements. */
export const statements = (card: EntityCardModel, selection: BrowseSelection): string[] => {
  if (!selection.property || selection.entity) {
    return [];
  }
  const property = [
    ...card.properties.map((property) => ({ key: propertyKey('out', property.predicate), property })),
    ...card.inverse.map((property) => ({ key: propertyKey('in', property.predicate), property })),
  ].find(({ key }) => key === selection.property)?.property;
  return property?.values.flatMap((value) => (value.kind === 'literal' ? [value.label] : [])) ?? [];
};
