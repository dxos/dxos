//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Result from 'effect/Result';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';

import { GatewayError, type ToolFailure } from './errors';
import * as Gateway from './Gateway';
import * as Projection from './Projection';
import * as Server from './Server';

const SPACE_A = SpaceId.random();
const SPACE_B = SpaceId.random();

type Invocation = Gateway.InvokeRequest;

const testGateway = ({
  spaceIds = [SPACE_A],
  operations = [],
  skills = [],
  output = { ok: true },
  outage,
}: {
  spaceIds?: readonly string[];
  operations?: readonly Gateway.OperationRecord[];
  skills?: readonly Gateway.SkillRecord[];
  output?: unknown;
  outage?: boolean;
} = {}): { gateway: Gateway.Shape; invocations: Invocation[] } => {
  const invocations: Invocation[] = [];
  const fail = Effect.fail(new GatewayError({ message: 'registry unavailable' }));
  return {
    invocations,
    gateway: {
      spaceIds,
      listOperations: outage ? fail : Effect.succeed(operations),
      listSkills: outage ? fail : Effect.succeed(skills),
      invokeOperation: (request) => {
        invocations.push(request);
        return outage ? fail : Effect.succeed(output);
      },
    },
  };
};

const operation = (props: Partial<Projection.ProjectedOperation> = {}): Projection.ProjectedOperation => ({
  key: 'org.dxos.function.tasks.create',
  toolName: 'taskCreate',
  safety: 'write',
  parameters: {},
  ...props,
});

const skill = (props: { key: string; instructions: string }) => ({ ...props, mcpPrompt: true, name: props.key });

describe('Server', () => {
  describe('projected tool handler', () => {
    test('dispatches the operation into the session default space', async ({ expect }) => {
      const { gateway, invocations } = testGateway();
      const result = await EffectEx.runPromise(Server.makeHandler(gateway, operation())({ title: 'Write tests' }));
      expect(invocations).to.deep.equal([
        { key: 'org.dxos.function.tasks.create', input: { title: 'Write tests' }, spaceId: SPACE_A },
      ]);
      expect(result).to.deep.equal({ ok: true });
    });

    test('a non-object output is wrapped, because structuredContent must be an object', async ({ expect }) => {
      const { gateway } = testGateway({ output: 42 });
      const result = await EffectEx.runPromise(Server.makeHandler(gateway, operation())({}));
      expect(result).to.deep.equal({ output: 42 });
    });

    test('space-less references in the result are qualified with the space they resolved in', async ({ expect }) => {
      const { gateway } = testGateway({ output: { taskSet: { '/': 'echo:///01J000000000000000000000000' } } });
      const result = await EffectEx.runPromise(Server.makeHandler(gateway, operation())({}));
      expect(result).to.deep.equal({ taskSet: { '/': `echo://${SPACE_A}/01J000000000000000000000000` } });
    });

    test('a space-qualified ref argument selects its space when spaceId is omitted', async ({ expect }) => {
      const { gateway, invocations } = testGateway({ spaceIds: [SPACE_A, SPACE_B] });
      await EffectEx.runPromise(
        Server.makeHandler(gateway, operation())({ taskSet: { '/': `echo://${SPACE_B}/01J000000000000000000000000` } }),
      );
      expect(invocations[0].spaceId).to.equal(SPACE_B);
    });

    test('an explicit spaceId still wins over the reference hint', async ({ expect }) => {
      const { gateway, invocations } = testGateway({ spaceIds: [SPACE_A, SPACE_B] });
      await EffectEx.runPromise(
        Server.makeHandler(
          gateway,
          operation(),
        )({ spaceId: SPACE_A, taskSet: { '/': `echo://${SPACE_B}/01J000000000000000000000000` } }),
      );
      expect(invocations[0].spaceId).to.equal(SPACE_A);
      expect(invocations[0].input).to.not.have.property('spaceId');
    });

    test('a space outside the session context is refused before the operation runs', async ({ expect }) => {
      const { gateway, invocations } = testGateway();
      const result = await EffectEx.runPromise(
        Effect.result(Server.makeHandler(gateway, operation())({ spaceId: SPACE_B })),
      );
      expect(failureOf(result).code).to.equal('space_not_in_context');
      expect(invocations).to.have.length(0);
    });

    test('an operation failure carries the underlying message, not an Effect envelope', async ({ expect }) => {
      const { gateway } = testGateway({ outage: true });
      const result = await EffectEx.runPromise(Effect.result(Server.makeHandler(gateway, operation())({})));
      expect(failureOf(result).message).to.include('registry unavailable');
      expect(failureOf(result).code).to.equal('operation_failed');
    });
  });

  describe('registry loading', () => {
    test('a registry outage degrades to an empty projection rather than failing the request', async ({ expect }) => {
      const { gateway } = testGateway({ outage: true });
      const [operations, skills] = await EffectEx.runPromise(
        Effect.all([Server.loadOperations([]), Server.loadSkills([])]).pipe(
          Effect.provideService(Gateway.Service, gateway),
        ),
      );
      expect(operations).to.deep.equal([]);
      expect(skills).to.deep.equal([]);
    });
  });

  describe('skillLoad', () => {
    const run = (gateway: Gateway.Shape, name: string) =>
      EffectEx.runPromise(Effect.result(Server.loadSkillByName(gateway, name)));

    test('returns the skill instructions by prompt name, or by full registry key', async ({ expect }) => {
      const { gateway } = testGateway({
        skills: [skill({ key: 'org.dxos.plugin.projects.skill.codeProject', instructions: 'Bind a space first.' })],
      });
      const byName = await run(gateway, 'codeProject');
      const byKey = await run(gateway, 'dxn:org.dxos.plugin.projects.skill.codeProject');
      expect(successOf(byName).instructions).to.equal('Bind a space first.');
      expect(successOf(byKey).instructions).to.equal('Bind a space first.');
    });

    test('an unknown skill fails with the available names', async ({ expect }) => {
      const { gateway } = testGateway({
        skills: [skill({ key: 'org.dxos.plugin.projects.skill.codeProject', instructions: 'Bind a space first.' })],
      });
      expect(failureOf(await run(gateway, 'nope')).message).to.include('codeProject');
    });

    test('a registry outage is a failure, so "unknown skill" always means the name was wrong', async ({ expect }) => {
      const { gateway } = testGateway({ outage: true });
      expect(failureOf(await run(gateway, 'codeProject')).code).to.equal('operation_failed');
    });
  });
});

const failureOf = <A>(result: Result.Result<A, ToolFailure>): ToolFailure => {
  if (result._tag !== 'Failure') {
    throw new Error(`Expected a failure, got: ${JSON.stringify(result.success)}`);
  }
  return result.failure;
};

const successOf = <A>(result: Result.Result<A, ToolFailure>): A => {
  if (result._tag !== 'Success') {
    throw new Error(`Expected a success, got: ${result.failure.message}`);
  }
  return result.success;
};
