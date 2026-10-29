//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Obj, type Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { RDF } from '@dxos/pipeline-rdf';
import { Organization, Person } from '@dxos/types';

import * as BrainService from './BrainService.ts';
import * as Goal from './Goal.ts';

/** True when the ref points at the entity, whether it is space-qualified or local. */
export const refersTo = (ref: Pick<Ref.Unknown, 'uri'>, id: string): boolean => {
  const uri = EID.tryParse(ref.uri);
  return uri !== undefined && EID.getEntityId(uri) === id;
};

/** Best display name for a profile subject. */
export const displayName = (subject: Obj.Unknown): string => {
  if (Obj.instanceOf(Person.Person, subject)) {
    return subject.preferredName ?? subject.fullName ?? subject.nickname ?? 'Unknown person';
  }
  if (Obj.instanceOf(Organization.Organization, subject)) {
    return subject.name ?? 'Unknown organization';
  }
  return Obj.getLabel(subject) ?? 'Unknown';
};

/** Goals that still matter: everything but dropped. */
export const isLiveGoal = (goal: Goal.Goal): boolean => goal.status !== 'dropped';

const GOAL_SECTIONS: { heading: string; statuses: Goal.Status[] }[] = [
  { heading: 'Goals', statuses: ['confirmed', 'active'] },
  { heading: 'Proposed goals', statuses: ['proposed'] },
  { heading: 'Achieved goals', statuses: ['achieved'] },
];

export type RenderProps = {
  name: string;
  goals: readonly Goal.Goal[];
  /** The facts that hold about the subject. */
  facts: readonly RDF.Fact[];
  /** The entity keys facts about the subject use, so a fact it is the subject of reads as just its object. */
  keys: ReadonlySet<string>;
};

/** A section heading for a predicate label: `works for` reads as `Works for`. */
const sectionHeading = (label: string): string => label.charAt(0).toUpperCase() + label.slice(1);

/**
 * Renders the profile markdown deterministically, so regenerating with unchanged facts yields the same document: goals
 * by status, then one section per predicate, each listing what the facts state once.
 */
export const render = ({ name, goals, facts, keys }: RenderProps): string => {
  const lines = [`# ${name}`, ''];
  for (const { heading, statuses } of GOAL_SECTIONS) {
    const section = goals
      .filter((goal) => statuses.includes(goal.status))
      .sort((left, right) => left.title.localeCompare(right.title));
    if (section.length > 0) {
      lines.push(`## ${heading}`, '');
      for (const goal of section) {
        lines.push(`- **${goal.title}** (${goal.horizon})${goal.description ? ` - ${goal.description}` : ''}`);
      }
      lines.push('');
    }
  }

  const sections = new Map<string, Set<string>>();
  for (const fact of facts) {
    const { subject, predicate, object } = fact.assertion;
    // Synonyms share their predicate's section, under its ontology label.
    const label =
      RDF.Ontology.DEFAULT.canonical(RDF.Mapping.predicateOf(fact))?.label ?? predicate.trim().toLowerCase();
    const isSubject = subject.kind === 'entity' && keys.has(subject.entity);
    const statement = isSubject
      ? `${fact.factuality.polarity === '-' ? 'not: ' : ''}${BrainService.termText(object)}`
      : BrainService.factText(fact);
    const line = `${statement}${fact.origin === 'inferred' ? ' _(inferred)_' : ''}`;
    sections.set(label, (sections.get(label) ?? new Set()).add(line));
  }
  for (const [label, section] of [...sections].sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`## ${sectionHeading(label)}`, '');
    for (const line of [...section].sort()) {
      lines.push(`- ${line}`);
    }
    lines.push('');
  }

  return lines.join('\n');
};
