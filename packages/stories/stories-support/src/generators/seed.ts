//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Organization, Person, TaskSet } from '@dxos/types';

import { ACTORS, type Actor } from './corpus.ts';
import { CANONICAL_DOCUMENTS, toMarkdown } from './documents.ts';

export const MAILBOX_NAME = 'Support';
export const TASK_SET_NAME = 'Support';

/** What the pipeline needs from a seeded space. */
export type Seeded = {
  readonly mailbox: Mailbox.Mailbox;
  readonly taskSet: TaskSet.TaskSet;
};

/**
 * Seeds a space for the demo: the support mailbox, the task set, the canonical documents, and the people and
 * organizations the support team already knows.
 */
export const seed = async (db: Database.Database): Promise<Seeded> => {
  const mailbox = db.add(Mailbox.make({ name: MAILBOX_NAME }));
  const taskSet = db.add(TaskSet.make({ name: TASK_SET_NAME }));
  for (const document of CANONICAL_DOCUMENTS) {
    db.add(Markdown.make({ name: document.title, content: toMarkdown(document) }));
  }

  const organizations = new Map<string, Organization.Organization>();
  const actors: readonly Actor[] = Object.values(ACTORS);
  for (const actor of actors) {
    if (actor.seeded === 'none' || !actor.organization) {
      continue;
    }
    const { name, website } = actor.organization;
    const organization = organizations.get(website) ?? db.add(Obj.make(Organization.Organization, { name, website }));
    organizations.set(website, organization);
    if (actor.seeded === 'person-and-organization') {
      db.add(
        Obj.make(Person.Person, {
          fullName: actor.name,
          emails: [{ value: actor.email }],
          organization: Ref.make(organization),
        }),
      );
    }
  }

  // Indexed before the first message so identity matching and document search see the seed.
  await db.flush({ indexes: true });
  return { mailbox, taskSet };
};
