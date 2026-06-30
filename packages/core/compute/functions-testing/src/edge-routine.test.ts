//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Chat, DatabaseSkill, RunInstructions } from '@dxos/assistant-toolkit';
import { Client } from '@dxos/client';
import { Instructions, Operation, Skill, Trigger } from '@dxos/compute';
import { configPreset } from '@dxos/config';
import { Context } from '@dxos/context';
import { Feed, Obj, Ref, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { dbg, log } from '@dxos/log';
import { ErrorCodec } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { sync } from './testing';

/**
 * Cron trigger on EDGE runs {@link RunInstructions} for a {@link Routine} that uses the Database
 * skill Query tool against replicated ECHO documents.
 *
 * Prereq: local EDGE (`configPreset({ edge: 'local' })` → `http://localhost:8787`) with LLM
 * available (API key and/or memo replay under `conversationsCache/`).
 */
describe('Edge instructions', { tags: ['functions-e2e'] }, () => {
  const config = configPreset({ edge: 'local' });

  test('timer trigger runs instructions with database skill on edge', { timeout: 420_000 }, async ({ expect }) => {
    await using client = await new Client({
      config,
      types: [
        Operation.PersistentOperation,
        Trigger.Trigger,
        Instructions.Instructions,
        Skill.Skill,
        Feed.Feed,
        Text.Text,
        Chat.Chat,
        TestSchema.Organization,
      ],
    }).initialize();

    await client.halo.createIdentity();
    const space = await client.spaces.create();
    await space.waitUntilReady();

    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

    Obj.update(space.properties, (properties) => {
      properties.computeEnvironment = 'edge';
    });

    space.db.add(Obj.make(TestSchema.Organization, { name: 'Acme Corp' }));
    space.db.add(Obj.make(TestSchema.Organization, { name: 'Globex Industries' }));
    space.db.add(Obj.make(TestSchema.Organization, { name: 'Initech' }));

    const databaseSkill = space.db.add(DatabaseSkill.make());

    const instructions = space.db.add(
      Instructions.make({
        name: 'edge-e2e-count-orgs-db-skill',
        text: trim`
              You have access to the Database skill tools.
              Use the Query tool exactly once with typename "${Type.getTypename(TestSchema.Organization)}" and no other arguments.
              Then call completeJob with the output object { "count": <number of rows returned by Query> }.
              If you are unable to query -- fail.
              Do not list schemas first.
            `,
        skills: [Ref.make(databaseSkill)],
      }),
    );
    const fn = Operation.serialize(RunInstructions);
    dbg(Obj.toJSON(fn));

    const trigger = space.db.add(
      Obj.make(Trigger.Trigger, {
        enabled: true,
        runnable: Ref.make(fn),
        spec: Trigger.specTimer('* * * * * *'),
        input: {
          instructions: Ref.make(instructions),
          input: {},
          model: 'com.anthropic.model.claude-haiku-4-5.default',
        },
      }),
    );

    await sync(space);

    log('trigger created and synced');
    log.break();

    const runResult: any = await client.edge.http.forceRunCronTrigger(Context.default(), space.id, trigger.id);
    if (runResult._kind === 'error') {
      throw ErrorCodec.decode(runResult.error);
    }
    log('trigger ran', { runResult });
    expect(runResult.result.count).toBe(3);
  });
});
