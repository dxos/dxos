//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN, SpaceId } from '@dxos/keys';

import * as Projection from './internal/projection';
import * as McpRegistry from './McpRegistry';
import * as McpServer from './McpServer';

const SPACE = SpaceId.random();
const SPACE_A = SpaceId.random();
const SPACE_B = SpaceId.random();

type Invocation = McpRegistry.InvokeRequest;

const testGateway = ({
  spaceIds = [SPACE_A],
  operations = [],
  skills = [],
  output = { ok: true },
  outage,
}: {
  spaceIds?: readonly string[];
  operations?: readonly McpRegistry.OperationRecord[];
  skills?: readonly McpRegistry.SkillRecord[];
  output?: unknown;
  outage?: boolean;
} = {}): { gateway: McpRegistry.Shape; invocations: Invocation[] } => {
  const invocations: Invocation[] = [];
  const fail = Effect.fail(new McpRegistry.Error({ message: 'registry unavailable' }));
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

const operation = (tool: Partial<Projection.ProjectedOperation['tool']> = {}): Projection.ProjectedOperation => ({
  key: 'org.dxos.function.tasks.create',
  tool: {
    name: 'taskCreate',
    parameters: {},
    requiresSpace: true,
    hints: { mutation: 'write' },
    ...tool,
  },
});

const skill = (props: { key: string; instructions: string }) => ({ ...props, mcpPrompt: true, name: props.key });

describe('McpServer', () => {
  describe('projected tool handler', () => {
    test('dispatches the operation into the session default space', async ({ expect }) => {
      const { gateway, invocations } = testGateway();
      const result = await EffectEx.runPromise(McpServer.makeHandler(gateway, operation())({ title: 'Write tests' }));
      expect(invocations).to.deep.equal([
        { key: 'org.dxos.function.tasks.create', input: { title: 'Write tests' }, spaceId: SPACE_A },
      ]);
      expect(result).to.deep.equal({ ok: true });
    });

    test('a non-object output is wrapped, because structuredContent must be an object', async ({ expect }) => {
      const { gateway } = testGateway({ output: 42 });
      const result = await EffectEx.runPromise(McpServer.makeHandler(gateway, operation())({}));
      expect(result).to.deep.equal({ output: 42 });
    });

    test('space-less references in the result are qualified with the space they resolved in', async ({ expect }) => {
      const { gateway } = testGateway({ output: { taskSet: { '/': 'echo:///01J000000000000000000000000' } } });
      const result = await EffectEx.runPromise(McpServer.makeHandler(gateway, operation())({}));
      expect(result).to.deep.equal({ taskSet: { '/': `echo://${SPACE_A}/01J000000000000000000000000` } });
    });

    test('a reference reachable by two paths is qualified on both', async ({ expect }) => {
      const shared = { '/': 'echo:///01J000000000000000000000000' };
      const { gateway } = testGateway({ output: { first: shared, second: shared } });
      const result = await EffectEx.runPromise(McpServer.makeHandler(gateway, operation())({}));
      const qualified = { '/': `echo://${SPACE_A}/01J000000000000000000000000` };
      expect(result).to.deep.equal({ first: qualified, second: qualified });
    });

    test('an operation that declares spaceId itself receives it as input', async ({ expect }) => {
      const { gateway, invocations } = testGateway();
      await EffectEx.runPromise(
        McpServer.makeHandler(gateway, operation({ parameters: { spaceId: Schema.String } }))({ spaceId: SPACE_A }),
      );
      expect(invocations[0].input).to.deep.equal({ spaceId: SPACE_A });
      expect(invocations[0].spaceId).to.equal(SPACE_A);
    });

    test('a space-qualified ref argument selects its space when spaceId is omitted', async ({ expect }) => {
      const { gateway, invocations } = testGateway({ spaceIds: [SPACE_A, SPACE_B] });
      await EffectEx.runPromise(
        McpServer.makeHandler(
          gateway,
          operation(),
        )({ taskSet: { '/': `echo://${SPACE_B}/01J000000000000000000000000` } }),
      );
      expect(invocations[0].spaceId).to.equal(SPACE_B);
    });

    test('an explicit spaceId still wins over the reference hint', async ({ expect }) => {
      const { gateway, invocations } = testGateway({ spaceIds: [SPACE_A, SPACE_B] });
      await EffectEx.runPromise(
        McpServer.makeHandler(
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
        Effect.result(McpServer.makeHandler(gateway, operation())({ spaceId: SPACE_B })),
      );
      expect(failureOf(result).code).to.equal('space_not_in_context');
      expect(invocations).to.have.length(0);
    });

    test('an operation failure carries the underlying message, not an Effect envelope', async ({ expect }) => {
      const { gateway } = testGateway({ outage: true });
      const result = await EffectEx.runPromise(Effect.result(McpServer.makeHandler(gateway, operation())({})));
      expect(failureOf(result).message).to.include('registry unavailable');
      expect(failureOf(result).code).to.equal('operation_failed');
    });
  });

  describe('makeTool', () => {
    test('a space-addressed operation gains the ambient spaceId parameter; others do not', ({ expect }) => {
      const spaceAddressed = McpServer.makeTool(operation({ requiresSpace: true }));
      const spaceless = McpServer.makeTool(operation({ requiresSpace: false }));
      expect(Object.keys(spaceAddressed.parametersSchema.fields)).to.include('spaceId');
      expect(Object.keys(spaceless.parametersSchema.fields)).to.not.include('spaceId');
    });

    test('an operation declaring its own spaceId keeps it, without the ambient duplicate', ({ expect }) => {
      const tool = McpServer.makeTool(operation({ requiresSpace: true, parameters: { spaceId: Schema.String } }));
      expect(tool.parametersSchema.fields.spaceId).to.equal(Schema.String);
    });
  });

  describe('registry loading', () => {
    test('a registry outage degrades to an empty projection rather than failing the request', async ({ expect }) => {
      const { gateway } = testGateway({ outage: true });
      const [operations, skills] = await EffectEx.runPromise(
        Effect.all([McpServer.loadOperations([], []), McpServer.loadSkills([])]).pipe(
          Effect.provideService(McpRegistry.Service, gateway),
        ),
      );
      expect(operations).to.deep.equal([]);
      expect(skills).to.deep.equal([]);
    });
  });

  describe('skillLoad', () => {
    const run = (gateway: McpRegistry.Shape, name: string) =>
      EffectEx.runPromise(Effect.result(McpServer.loadSkillByName(gateway, name)));

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

  describe('normalizeResponse', () => {
    const jsonResponse = (body: unknown) =>
      new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

    const initialize = { jsonrpc: '2.0', id: 1, result: { serverInfo: { name: 'x', version: '1' } } };

    test('unwraps a single-element batch, which the MCP transport requires', async ({ expect }) => {
      const response = await McpServer.normalizeResponse(jsonResponse([initialize]));
      const body = await response.json();
      expect(Array.isArray(body)).to.be.false;
      expect(body.id).to.equal(1);
    });

    test('leaves a multi-element batch alone', async ({ expect }) => {
      const response = await McpServer.normalizeResponse(jsonResponse([initialize, initialize]));
      expect(await response.json()).to.have.length(2);
    });

    test('advertises the shared identity, with host fields layered on top', async ({ expect }) => {
      const icons = McpServer.icons('https://mcp.example');
      const response = await McpServer.normalizeResponse(jsonResponse([initialize]), { serverInfo: { icons } });
      const { serverInfo } = (await response.json()).result;
      expect(serverInfo.title).to.equal(McpServer.identity.title);
      expect(serverInfo.websiteUrl).to.equal(McpServer.identity.websiteUrl);
      expect(serverInfo.icons[0].src).to.equal(`https://mcp.example${McpServer.ICON_LIGHT_PATH}`);
      // The name the layer set is the host's own and must survive the merge.
      expect(serverInfo.name).to.equal('x');
    });

    test('serves the embedded mark for its own paths only', async ({ expect }) => {
      const icon = McpServer.iconResponse(McpServer.ICON_DARK_PATH);
      if (!icon) {
        throw new Error('the mark was not served for its own path');
      }
      expect(icon.headers.get('Content-Type')).to.equal('image/png');
      expect((await icon.arrayBuffer()).byteLength).to.be.greaterThan(0);
      expect(McpServer.iconResponse('/nope.png')).to.be.undefined;
    });

    test('drops a Content-Length the passes above invalidated', async ({ expect }) => {
      const body = JSON.stringify([initialize]);
      const response = await McpServer.normalizeResponse(
        new Response(body, {
          headers: { 'content-type': 'application/json', 'content-length': String(body.length) },
        }),
      );
      expect(response.headers.get('content-length')).to.be.null;
      expect((await response.json()).id).to.equal(1);
    });
  });

  describe('snapshot', () => {
    test('an object reachable by two paths is snapshotted on both', ({ expect }) => {
      const shared = { title: 'shared' };
      const result = McpRegistry.snapshot({ first: shared, second: shared }) as Record<string, unknown>;
      expect(result).to.deep.equal({ first: shared, second: shared });
      // The second path must reach the snapshot too; returning the input there is how a live entity
      // escapes into a result.
      expect(result.first).to.equal(result.second);
      expect(result.first).to.not.equal(shared);
    });
  });
});

const failureOf = <A>(result: Result.Result<A, McpServer.ToolFailure>): McpServer.ToolFailure => {
  if (result._tag !== 'Failure') {
    throw new Error(`Expected a failure, got: ${JSON.stringify(result.success)}`);
  }
  return result.failure;
};

const successOf = <A>(result: Result.Result<A, McpServer.ToolFailure>): A => {
  if (result._tag !== 'Success') {
    throw new Error(`Expected a success, got: ${result.failure.message}`);
  }
  return result.success;
};

const CreateTask = Operation.make({
  meta: { key: DXN.make('org.dxos.function.tasks.taskCreate'), name: 'Create Task', description: 'Creates a task.' },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Struct({ id: Schema.String }),
  services: [Database.Service],
}).pipe(Operation.mutation('write'));

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

type StubInvocation = { key: string; input: unknown; spaceId?: string };

/** A stub invoker recording each call; `McpServer.gateway` needs nothing else from the runtime. */
const stubInvoker = (output: unknown = { id: 'T-1' }) => {
  const invocations: StubInvocation[] = [];
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
    McpServer.gateway({ skills: [definition], spaceIds: [SPACE] }).pipe(
      Effect.provideService(Operation.Service, service),
    ),
  );

describe('McpServer.fromSkills', () => {
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
    expect(projected.map((operation) => operation.tool.name)).to.deep.equal(['taskCreate']);
    expect(projected[0].tool.requiresSpace).to.be.true;
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
