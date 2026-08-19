//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN, SpaceId } from '@dxos/keys';

import * as DxMcpService from './DxMcpService';
import * as Projection from './internal/projection';

const SPACE = SpaceId.random();

const CreateTask = Operation.make({
  meta: { key: DXN.make('org.dxos.function.tasks.taskCreate'), name: 'Create Task', description: 'Creates a task.' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Struct({ id: Schema.String }),
  services: [Database.Service],
}).pipe(Operation.mcpTool({ name: 'taskCreate', safety: 'write' }));

const skillDefinition = (props: { mcpPrompt?: boolean } = {}): Skill.Definition => ({
  key: 'org.dxos.skill.tasks',
  make: () =>
    Skill.make({
      key: 'org.dxos.skill.tasks',
      name: 'Tasks',
      description: 'Task workflow.',
      mcpPrompt: props.mcpPrompt ?? true,
      instructions: Template.make({ source: 'File tasks into the set.' }),
      tools: Skill.toolDefinitions({ operations: [CreateTask] }),
    }),
  operations: [CreateTask],
});

type Invocation = { key: string; input: unknown; spaceId?: string };

/** A stub invoker recording each call; `DxMcpService.gateway` needs nothing else from the runtime. */
const stubInvoker = (output: unknown = { id: 'T-1' }) => {
  const invocations: Invocation[] = [];
  const service = {
    invoke: (op: Operation.Definition.Any, input: unknown, options?: Operation.InvokeOptions) => {
      invocations.push({ key: String(op.meta.key), input, spaceId: options?.spaceId });
      return Effect.succeed(output);
    },
    schedule: () => Effect.void,
    invokePromise: () => Promise.resolve({}),
    // Operation.OperationService.invoke is a complex overloaded type; a partial test stub
    // cannot express all overload variants without the cast.
  } as unknown as Operation.OperationService;
  return { service, invocations };
};

const buildGateway = (definition: Skill.Definition, service: Operation.OperationService) =>
  EffectEx.runPromise(
    DxMcpService.gateway({ skills: [definition], spaceIds: [SPACE] }).pipe(
      Effect.provideService(Operation.Service, service),
    ),
  );

describe('DxMcpService', () => {
  test('lists the skill with its tools and the serialized operations', async ({ expect }) => {
    const { service } = stubInvoker();
    const gateway = await buildGateway(skillDefinition(), service);

    const skills = await EffectEx.runPromise(gateway.listSkills);
    expect(skills).to.have.length(1);
    expect(skills[0].mcpPrompt).to.be.true;
    expect(skills[0].tools).to.deep.equal(['org.dxos.function.tasks.taskCreate']);

    const operations = await EffectEx.runPromise(gateway.listOperations);
    expect(operations).to.have.length(1);

    // The same records drive the projection, closing the loop to the tool surface.
    const projectedSkills = Projection.projectSkills(skills, []);
    const projected = Projection.projectOperations(operations, projectedSkills, []);
    expect(projected.map((operation) => operation.toolName)).to.deep.equal(['taskCreate']);
    expect(projected[0].requiresSpace).to.be.true;
  });

  test('invokes through the ambient Operation.Service, decoding input and passing the space', async ({ expect }) => {
    const { service, invocations } = stubInvoker({ id: 'T-9' });
    const gateway = await buildGateway(skillDefinition(), service);

    const output = await EffectEx.runPromise(
      gateway.invokeOperation({ key: 'org.dxos.function.tasks.taskCreate', input: { title: 'Ship' }, spaceId: SPACE }),
    );
    expect(output).to.deep.equal({ id: 'T-9' });
    expect(invocations).to.deep.equal([
      { key: 'dxn:org.dxos.function.tasks.taskCreate', input: { title: 'Ship' }, spaceId: SPACE },
    ]);
  });

  test('an unknown operation and an invalid space are gateway errors, not defects', async ({ expect }) => {
    const { service } = stubInvoker();
    const gateway = await buildGateway(skillDefinition(), service);

    const unknown = await EffectEx.runPromise(Effect.result(gateway.invokeOperation({ key: 'org.dxos.nope' })));
    expect(unknown._tag).to.equal('Failure');

    const invalid = await EffectEx.runPromise(
      Effect.result(
        gateway.invokeOperation({ key: 'org.dxos.function.tasks.taskCreate', input: { title: 'x' }, spaceId: 'bad' }),
      ),
    );
    expect(invalid._tag).to.equal('Failure');
  });

  test('a malformed input fails the call instead of reaching the invoker', async ({ expect }) => {
    const { service, invocations } = stubInvoker();
    const gateway = await buildGateway(skillDefinition(), service);

    const result = await EffectEx.runPromise(
      Effect.result(gateway.invokeOperation({ key: 'org.dxos.function.tasks.taskCreate', input: { title: 42 } })),
    );
    expect(result._tag).to.equal('Failure');
    expect(invocations).to.have.length(0);
  });
});
