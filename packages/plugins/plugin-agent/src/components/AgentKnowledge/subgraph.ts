//
// Copyright 2026 DXOS.org
//

import { RDF } from '@dxos/pipeline-rdf';

/** One value of a property: an entity is a chip that links to its own card, a literal is text. */
export type EntityCardValue = { kind: 'entity'; id: string; label: string } | { kind: 'literal'; label: string };

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
  /** Classes by entity id (`rdf:type`), which the reified facts do not carry. */
  types?: Readonly<Record<string, string>>;
  /** Labels by normalized predicate; the predicate as said otherwise. */
  labels?: Readonly<Record<string, string>>;
  /** Inverse labels by normalized predicate (`knows` → `Known by`); `<label> (of)` otherwise. */
  inverses?: Readonly<Record<string, string>>;
};

const valueOf = (term: RDF.Term): EntityCardValue =>
  term.kind === 'entity'
    ? { kind: 'entity', id: term.entity, label: term.label ?? term.entity }
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

  for (const { assertion } of facts) {
    if (assertion.subject.kind !== 'entity') {
      continue;
    }
    const predicate = RDF.Predicate.normalize(assertion.predicate);
    const label = options.labels?.[predicate] ?? assertion.predicate;
    const subject = card(assertion.subject.entity, assertion.subject.label);
    add(subject.properties, predicate, label, valueOf(assertion.object));

    if (assertion.object.kind === 'entity') {
      // Collected for every object, but an object gets a card only if it is also a subject (filtered below).
      const inverseLabel = options.inverses?.[predicate] ?? `${label} (of)`;
      add(
        card(assertion.object.entity, assertion.object.label).inverse,
        predicate,
        inverseLabel,
        valueOf(assertion.subject),
      );
    }
  }

  const subjects = new Set(
    facts.flatMap(({ assertion }) => (assertion.subject.kind === 'entity' ? [assertion.subject.entity] : [])),
  );
  return [...cards]
    .filter(([id]) => subjects.has(id))
    .map(([id, { label, properties, inverse }]) => ({
      id,
      label,
      type: options.types?.[id],
      properties: [...properties.values()],
      inverse: [...inverse.values()],
    }));
};
