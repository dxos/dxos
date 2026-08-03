//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown/types';
import { type Organization, type Person } from '@dxos/types';

import { ProfileOf } from '../types';

/** One profile document section; empty bodies render as a heading the user/agent fills in. */
export type ProfileSection = {
  readonly heading: string;
  readonly body?: string;
};

export type ProfileContent = {
  readonly title: string;
  readonly summary: string;
  readonly sections: ReadonlyArray<ProfileSection>;
};

/** Finds the existing ProfileOf relation whose target is the given subject. */
export const findProfileRelation = (subject: Obj.Unknown) =>
  Effect.gen(function* () {
    const relations = yield* Database.query(Filter.type(ProfileOf.ProfileOf)).run;
    return relations.find((relation) => Relation.getTarget(relation)?.id === subject.id);
  });

/**
 * Creates the profile document + ProfileOf relation for a subject, or refreshes the relation's
 * `lastResearchedAt` when a profile already exists. The document body is user/agent-owned after
 * creation and is never regenerated. The document is parented to its subject so it shares the
 * subject's lifetime (cascade delete).
 */
export const upsertProfile = (subject: Person.Person | Organization.Organization, content: ProfileContent) =>
  Effect.gen(function* () {
    const existing = yield* findProfileRelation(subject);
    if (existing) {
      Relation.update(existing, (existing) => {
        existing.lastResearchedAt = new Date().toISOString();
      });
      const source = Relation.getSource(existing);
      invariant(Obj.instanceOf(Markdown.Document, source), 'ProfileOf source must be a markdown document.');
      return { profile: Ref.make(source), created: false };
    }

    const profile = Markdown.make({ name: content.title, content: renderProfile(content) });
    Obj.setParent(profile, subject);
    yield* Database.add(profile);
    yield* Database.add(
      ProfileOf.make({
        [Relation.Source]: profile,
        [Relation.Target]: subject,
        sources: [],
        lastResearchedAt: new Date().toISOString(),
        summary: content.summary,
      }),
    );

    return { profile: Ref.make(profile), created: true };
  });

export const renderProfile = ({ title, summary, sections }: ProfileContent): string =>
  [
    `# ${title}`,
    '',
    '## Overview',
    '',
    summary,
    ...sections.flatMap((section) => ['', `## ${section.heading}`, ...(section.body ? ['', section.body] : [])]),
    '',
  ].join('\n');

export const personDisplayName = (person: Person.Person): string =>
  person.preferredName ?? person.fullName ?? person.nickname ?? person.emails?.[0]?.value ?? 'Unknown person';

export const personProfileContent = (
  person: Person.Person,
  organization?: Organization.Organization,
): ProfileContent => {
  const name = personDisplayName(person);
  const role = [person.jobTitle, organization?.name ?? undefined].filter(Boolean).join(' at ');
  const details = [
    ...(person.emails ?? []).map((email) => `- Email: ${email.value}`),
    ...(person.phoneNumbers ?? []).map((phone) => `- Phone: ${phone.value}`),
    ...(person.jobTitle ? [`- Job title: ${person.jobTitle}`] : []),
  ];
  const links = (person.urls ?? []).map((url) => `- ${url.value}`);
  return {
    title: name,
    summary: role.length > 0 ? `${name} — ${role}.` : `${name}.`,
    sections: [
      { heading: 'Details', body: details.length > 0 ? details.join('\n') : undefined },
      { heading: 'Organization', body: organization ? organizationLine(organization) : undefined },
      { heading: 'Key Links', body: links.length > 0 ? links.join('\n') : undefined },
      { heading: 'Notes' },
      { heading: 'Sources' },
    ],
  };
};

export const organizationProfileContent = (
  organization: Organization.Organization,
  people: ReadonlyArray<Person.Person>,
): ProfileContent => {
  const name = organization.name ?? organization.website ?? 'Unknown organization';
  return {
    title: name,
    summary: organization.description ?? `${name}.`,
    sections: [
      { heading: 'Details', body: organization.website ? `- Website: ${organization.website}` : undefined },
      {
        heading: 'People',
        body: people.length > 0 ? people.map((person) => `- ${personDisplayName(person)}`).join('\n') : undefined,
      },
      { heading: 'Key Links' },
      { heading: 'Notes' },
      { heading: 'Sources' },
    ],
  };
};

const organizationLine = (organization: Organization.Organization): string =>
  [organization.name, organization.website ? `(${organization.website})` : undefined].filter(Boolean).join(' ');
