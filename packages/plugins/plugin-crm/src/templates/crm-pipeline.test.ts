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
import { Database, Feed, Filter } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { TagIndex, Text } from '@dxos/schema';

import { CrmOperation } from '#types';

import { crmPipeline } from './crm-pipeline';

describe('crm pipeline project template', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('applies only to a Mailbox subject', async ({ expect }) => {
    const { mailbox } = await setup(builder);
    expect(crmPipeline.appliesTo?.(undefined)).toBe(false);
    expect(crmPipeline.appliesTo?.(mailbox)).toBe(true);
  });

  test('scaffolds a feed-triggered operation-action routine inside the project', async ({ expect }) => {
    const { db, mailbox } = await setup(builder);
    const project = await EffectEx.runPromise(
      crmPipeline
        .scaffold({ subject: mailbox })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db))),
    );
    db.add(project);
    await db.flush();

    // Chats: mailbox as context; CRM + research skills.
    const instructions = await project.instructions?.tryLoad();
    expect(instructions?.objects?.map((ref) => ref.target?.id)).toEqual([mailbox.id]);
    const projectSkills = instructions?.skills.map((ref) => ref.uri.toString()) ?? [];
    expect(projectSkills).toContain(Skill.registryURI('org.dxos.skill.crm').toString());
    expect(projectSkills).toContain(Skill.registryURI('org.dxos.skill.webSearch').toString());

    // Routine: a deterministic operation action (no instructions between trigger and operation),
    // persisted standalone rather than owned by the project.
    const routines = await db.query(Filter.type(Routine.Routine)).run();
    expect(routines).toHaveLength(1);
    const routine = routines[0];
    expect(routine?.spec?.kind).toBe('runnable');
    expect(routine?.spec?.kind === 'runnable' && routine.spec.runnable.uri.toString()).toBe(
      CrmOperation.ProcessMailbox.meta.key.toString(),
    );

    // Feed trigger ("run on sync"), off by default, mailbox ref + research flag baked into the input.
    const trigger = await routine?.triggers[0].tryLoad();
    expect(trigger?.enabled).toBe(false);
    expect(trigger?.spec?.kind).toBe('feed');
    expect(trigger?.input?.mailbox).toBeDefined();
    expect(trigger?.input?.research).toBe(true);
    expect(trigger?.concurrency).toBe(1);
  });
});

const setup = async (builder: EchoTestBuilder) => {
  const { db } = await builder.createDatabase({
    types: [
      Project.Project,
      Instructions.Instructions,
      Routine.Routine,
      Trigger.Trigger,
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
