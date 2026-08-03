//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Instructions, Project, Routine, Skill, Trigger } from '@dxos/compute';
import { Collection, Database, Feed, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { TagIndex, Text } from '@dxos/schema';

import { mailboxFacts } from './mailbox-facts';

describe('mailbox facts project template', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [
        Project.Project,
        Instructions.Instructions,
        Routine.Routine,
        Trigger.Trigger,
        Collection.Collection,
        Mailbox.Mailbox,
        Feed.Feed,
        TagIndex.TagIndex,
        Text.Text,
      ],
    });
    const mailbox = db.add(Mailbox.make({ name: 'Work' }));
    await db.flush();
    return { db, mailbox };
  };

  test('applies only to a Mailbox subject', async ({ expect }) => {
    const { mailbox } = await setup();
    expect(mailboxFacts.appliesTo?.(undefined)).toBe(false);
    expect(mailboxFacts.appliesTo?.(mailbox)).toBe(true);
  });

  test('scaffolds an operation-action analysis routine inside the project', async ({ expect }) => {
    const { db, mailbox } = await setup();
    const project = await EffectEx.runPromise(
      mailboxFacts
        .scaffold({ subject: mailbox })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
    );
    db.add(project);
    await db.flush();

    // Chats: mailbox as context; brain + inbox skills.
    const instructions = await project.instructions?.tryLoad();
    expect(instructions?.objects?.map((ref) => ref.target?.id)).toEqual([mailbox.id]);
    const projectSkills = instructions?.skills.map((ref) => ref.uri.toString()) ?? [];
    expect(projectSkills).toContain(Skill.registryURI('org.dxos.skill.brain').toString());
    expect(projectSkills).toContain(Skill.registryURI('org.dxos.skill.inbox').toString());

    // Routine: a deterministic operation action (no instructions), owned + linked.
    expect(project.routines).toHaveLength(1);
    const routine = await project.routines[0].tryLoad();
    expect(Obj.getParent(routine!)?.id).toBe(project.id);
    expect(routine!.spec?.kind).toBe('runnable');
    expect(routine!.spec?.kind === 'runnable' && routine!.spec.runnable.uri.toString()).toBe(
      InboxOperation.AnalyzeMailbox.meta.key.toString(),
    );

    // Timer trigger, off by default, with the mailbox ref baked into the operation input.
    const trigger = await routine!.triggers[0].tryLoad();
    expect(trigger?.enabled).toBe(false);
    expect(trigger?.spec?.kind).toBe('timer');
    expect(trigger?.input?.mailbox).toBeDefined();
  });
});
