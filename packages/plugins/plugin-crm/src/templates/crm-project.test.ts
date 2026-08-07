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
import { Collection, Database, Feed, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { TagIndex, Text } from '@dxos/schema';

import { crmProject } from './crm-project';

describe('crm sender-research project template', () => {
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
    const mailbox = db.add(Mailbox.make({ name: 'Clients' }));
    await db.flush();
    return { db, mailbox };
  };

  test('applies only to a Mailbox subject', async ({ expect }) => {
    const { mailbox } = await setup();
    expect(crmProject.appliesTo?.(undefined)).toBe(false);
    expect(crmProject.appliesTo?.(mailbox)).toBe(true);
  });

  test('scaffolds the research project with a filing-capable routine', async ({ expect }) => {
    const { db, mailbox } = await setup();
    const project = await EffectEx.runPromise(
      crmProject.scaffold({ subject: mailbox }).pipe(Effect.provideService(Database.Service, Database.makeService(db))),
    );
    db.add(project);
    await db.flush();

    // Chats: mailbox as context; CRM + research skills.
    const instructions = await project.instructions?.tryLoad();
    expect(instructions?.objects?.map((ref) => ref.target?.id)).toEqual([mailbox.id]);
    const projectSkills = instructions?.skills.map((ref) => ref.uri.toString()) ?? [];
    expect(projectSkills).toContain(Skill.registryURI('org.dxos.skill.crm').toString());
    expect(projectSkills).toContain(Skill.registryURI('org.dxos.skill.webSearch').toString());

    // Routine: owned + linked; project context; CRM skills PLUS the project skill for artifact filing.
    expect(project.routines).toHaveLength(1);
    const routine = await project.routines[0].tryLoad();
    expect(Obj.getParent(routine!)?.id).toBe(project.id);
    const routineInstructions = await Routine.instructionsRef(routine!)?.tryLoad();
    expect(routineInstructions?.objects?.map((ref) => ref.target?.id)).toEqual([project.id]);
    const routineSkills = routineInstructions?.skills.map((ref) => ref.uri.toString()) ?? [];
    expect(routineSkills).toContain(Skill.registryURI('org.dxos.skill.crm').toString());
    expect(routineSkills).toContain(Skill.registryURI('org.dxos.skill.project').toString());

    // Feed trigger, off by default, message as input.
    const trigger = await routine!.triggers[0].tryLoad();
    expect(trigger?.enabled).toBe(false);
    expect(trigger?.spec?.kind).toBe('feed');
    expect(trigger?.input?.input).toBe('{{event.item}}');
  });
});
