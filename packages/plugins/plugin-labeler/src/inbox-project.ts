//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { trim } from '@dxos/util';

import { LABELER_TAG_SOURCE } from './constants.ts';

/** The skill that lets the agent send mail; the inbox skill arrives with the mailbox binding. */
const INBOX_SEND_SKILL_KEY = 'org.dxos.skill.inboxSend';

/** What an agent assigned one of the project's tasks is told; tasks name the email they came from. */
export const INBOX_PROJECT_INSTRUCTIONS = trim`
  Every task in this project was extracted from an email in the bound mailbox. A task's description
  names the email (its subject and sender), and the task's first artifact is a reference to that email.
  To complete a task, write a short, friendly reply that does what the sender asked, and send it with
  the "Send an email reply" operation (\`org.dxos.operation.inbox.sendReply\`): pass the bound mailbox,
  the task's first artifact as \`message\` (pass the reference itself; do not rebuild it from an id), and
  the reply as \`body\`. Everything you need is in the task and the bound objects, so do not explore the
  space first.
  Sign the reply as the mailbox owner. Do not invent facts, dates, or attachments.
  When the reply is sent, mark the task ready for review.
`;

const projectKey = (mailbox: Mailbox.Mailbox) => ({ source: LABELER_TAG_SOURCE, id: `project:${mailbox.id}` });

/**
 * The project a mailbox's extracted tasks are filed in, created on first use. Keyed by the mailbox so a
 * re-run files into the same project, and bound to the mailbox so a task delegated from it can read
 * and answer the email it came from.
 */
export const findOrCreateInboxProject = Effect.fnUntraced(function* (mailbox: Mailbox.Mailbox) {
  const [existing] = yield* Database.query(Filter.foreignKeys(Project.Project, [projectKey(mailbox)])).run;
  if (existing) {
    return existing;
  }
  const project = Project.make({
    [Obj.Meta]: { keys: [projectKey(mailbox)] },
    name: `${mailbox.name ?? 'Inbox'} tasks`,
    description: 'Action items extracted from email.',
    status: 'active',
  });
  const instructions = Instructions.make({
    [Obj.Parent]: project,
    name: 'Inbox tasks',
    text: INBOX_PROJECT_INSTRUCTIONS,
    skills: [Ref.fromURI(Skill.registryURI(Mailbox.SKILL_KEY)), Ref.fromURI(Skill.registryURI(INBOX_SEND_SKILL_KEY))],
    objects: [Ref.make(mailbox)],
  });
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
  });
  return yield* Database.add(project);
});
