//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Collection, Database, Feed, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { TagIndex, Text } from '@dxos/schema';

import { inboxResearch } from './inbox-research';

describe('inbox research project template', () => {
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
    const feed = await mailbox.feed.tryLoad();
    await db.flush();
    return { db, feed, mailbox };
  };

  test('applies only to a Mailbox subject', async ({ expect }) => {
    const { mailbox } = await setup();
    expect(inboxResearch.appliesTo?.(undefined)).toBe(false);
    expect(inboxResearch.appliesTo?.(mailbox)).toBe(true);
  });

  test('scaffolds the pre-wired project graph', async ({ expect }) => {
    const { db, feed, mailbox } = await setup();
    const project = await EffectEx.runPromise(
      inboxResearch
        .scaffold({ subject: mailbox })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
    );
    db.add(project);
    await db.flush();

    // Project instructions: mailbox as standing context, inbox + table skills.
    const instructions = await project.instructions?.tryLoad();
    expect(instructions?.objects?.map((ref) => ref.target?.id)).toEqual([mailbox.id]);
    const projectSkills = instructions?.skills.map((ref) => ref.uri.toString()) ?? [];
    expect(projectSkills).toContain(Skill.registryURI('org.dxos.skill.inbox').toString());
    expect(projectSkills).toContain(Skill.registryURI('org.dxos.skill.table').toString());

    // Starter routine: owned by the project AND linked into `routines`.
    expect(project.routines).toHaveLength(1);
    const routine = await project.routines[0].tryLoad();
    expect(Obj.getParent(routine!)?.id).toBe(project.id);

    // The routine's headless scope: project ref as context, table + project skills.
    const routineInstructionsRef = Routine.instructionsRef(routine!);
    const routineInstructions = await routineInstructionsRef?.tryLoad();
    expect(routineInstructions?.objects?.map((ref) => ref.target?.id)).toEqual([project.id]);
    const routineSkills = routineInstructions?.skills.map((ref) => ref.uri.toString()) ?? [];
    expect(routineSkills).toContain(Skill.registryURI('org.dxos.skill.table').toString());
    expect(routineSkills).toContain(Skill.registryURI('org.dxos.skill.project').toString());

    // Feed trigger on the mailbox's feed, disabled until the user opts in, message as input.
    expect(routine!.triggers).toHaveLength(1);
    const trigger = await routine!.triggers[0].tryLoad();
    expect(trigger?.enabled).toBe(false);
    expect(trigger?.spec?.kind).toBe('feed');
    expect(trigger?.spec?.kind === 'feed' && trigger.spec.feed?.target?.id).toBe(feed?.id);
    // `wireTriggers` adds the RunInstructions `instructions` binding beside the template-provided input.
    expect(trigger?.input?.input).toBe('{{event.item}}');
    expect(trigger?.input?.instructions).toBeDefined();

    // The trigger is wired to run the routine's instructions (`makeRoutine`'s RunInstructions wiring).
    expect(trigger?.runnable).toBeDefined();
  });

  test('deleting the project removes the starter routine with it', async ({ expect }) => {
    const { db, mailbox } = await setup();
    const project = await EffectEx.runPromise(
      inboxResearch
        .scaffold({ subject: mailbox })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
    );
    db.add(project);
    await db.flush();
    expect((await db.query(Filter.type(Routine.Routine)).run()).length).toBe(1);

    db.remove(project);
    await db.flush();
    expect((await db.query(Filter.type(Routine.Routine)).run()).length).toBe(0);
  });
});
