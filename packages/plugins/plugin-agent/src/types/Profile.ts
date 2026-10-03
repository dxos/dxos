//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Obj, type Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Organization, Person } from '@dxos/types';

import * as Goal from './Goal.ts';
import * as Memory from './Memory.ts';

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

/** Newest first; the id breaks ties so equal timestamps keep a stable order. */
export const byNewest = (left: Memory.Memory, right: Memory.Memory): number =>
  right.observedAt.localeCompare(left.observedAt) || right.id.localeCompare(left.id);

/** Goals that still matter: everything but dropped. */
export const isLiveGoal = (goal: Goal.Goal): boolean => goal.status !== 'dropped';

const KIND_SECTIONS: { kind: Memory.Kind; heading: string }[] = [
  { kind: 'fact', heading: 'Facts' },
  { kind: 'preference', heading: 'Preferences' },
  { kind: 'goal', heading: 'Aspirations' },
  { kind: 'commitment', heading: 'Commitments' },
  { kind: 'relationship', heading: 'Relationships' },
  { kind: 'event', heading: 'Events' },
  { kind: 'directive', heading: 'Rules and preferences' },
  { kind: 'note', heading: 'Notes' },
];

const GOAL_SECTIONS: { heading: string; statuses: Goal.Status[] }[] = [
  { heading: 'Goals', statuses: ['confirmed', 'active'] },
  { heading: 'Proposed goals', statuses: ['proposed'] },
  { heading: 'Achieved goals', statuses: ['achieved'] },
];

export type RenderProps = {
  name: string;
  goals: readonly Goal.Goal[];
  memories: readonly Memory.Memory[];
};

/**
 * Renders the profile markdown deterministically, so regenerating with unchanged memories yields
 * the same document; only active memories are included.
 */
export const render = ({ name, goals, memories }: RenderProps): string => {
  const lines = [`# ${name}`, ''];
  for (const { heading, statuses } of GOAL_SECTIONS) {
    const section = goals
      .filter((goal) => statuses.includes(goal.status))
      .sort((left, right) => left.title.localeCompare(right.title));
    if (section.length > 0) {
      lines.push(`## ${heading}`, '');
      for (const goal of section) {
        lines.push(`- **${goal.title}** (${goal.horizon})${goal.description ? ` — ${goal.description}` : ''}`);
      }
      lines.push('');
    }
  }

  const active = memories.filter((memory) => memory.status === 'active').sort(byNewest);
  for (const { kind, heading } of KIND_SECTIONS) {
    const section = active.filter((memory) => memory.kind === kind);
    if (section.length > 0) {
      lines.push(`## ${heading}`, '');
      for (const memory of section) {
        lines.push(`- ${memory.content}${memory.origin === 'inferred' ? ' _(inferred)_' : ''}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
};
