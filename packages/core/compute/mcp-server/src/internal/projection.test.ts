//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import * as Projection from './projection';

const REF_SCHEMA = {
  $id: '/schemas/echo/ref',
  properties: { '/': { type: 'string' } },
  required: ['/'],
};

/** Registry record in wire form: meta as a plain `@meta` property, input as JSON Schema. */
const record = ({
  key,
  mutation,
  description,
  properties,
  services,
}: {
  key: string;
  mutation?: string;
  description?: string;
  properties?: Record<string, unknown>;
  services?: readonly string[];
}) => ({
  'name': key,
  ...(services ? { services } : {}),
  description,
  '@meta': {
    key,
    annotations: {
      ...(mutation ? { [Projection.MUTATION_ANNOTATION_ID]: mutation } : {}),
    },
  },
  ...(properties ? { inputSchema: { type: 'object', properties, required: Object.keys(properties) } } : {}),
});

const skill = (props: {
  key: string;
  instructions?: string;
  mcpPrompt?: boolean;
  description?: string;
  tools?: readonly string[];
}) => ({
  name: props.key,
  ...props,
});

/** A projected skill that owns the given tool NSIDs — the driver of the operation projection. */
const owner = (promptName: string, tools: readonly string[]): Projection.ProjectedSkill => ({
  key: `org.dxos.skill.${promptName}`,
  promptName,
  instructions: 'Follow the workflow.',
  tools,
});

describe('Projection', () => {
  describe('annotation contract', () => {
    test('an operation named by a skill projects, with its annotations applied', ({ expect }) => {
      const operation = Operation.make({
        meta: { key: DXN.make('org.dxos.function.test.doThing'), name: 'Do thing' },
        input: Schema.Struct({ value: Schema.String }),
        output: Schema.Struct({ ok: Schema.Boolean }),
        services: [Database.Service],
      }).pipe(Operation.mutation('write'), Operation.idempotent);

      const [projected] = Projection.projectOperations(
        [Obj.toJSON(Operation.serialize(operation))],
        [owner('codeProject', ['org.dxos.function.test.doThing'])],
        [],
      );
      expect(projected.toolName).to.equal('doThing');
      expect(projected.mutation).to.equal('write');
      expect(projected.idempotent).to.be.true;
      expect(projected.requiresSpace).to.be.true;
      expect(Object.keys(projected.parameters)).to.deep.equal(['value']);
    });
  });

  describe('projectOperations', () => {
    test("only operations named by a projected skill's tools project", ({ expect }) => {
      const projected = Projection.projectOperations(
        [record({ key: 'org.dxos.function.tasks.taskCreate' }), record({ key: 'org.dxos.function.tasks.internal' })],
        [owner('codeProject', ['org.dxos.function.tasks.taskCreate'])],
        [],
      );
      expect(projected.map((operation) => operation.toolName)).to.deep.equal(['taskCreate']);
    });

    test('an unclassified operation projects with no mutation class', ({ expect }) => {
      const [projected] = Projection.projectOperations(
        [record({ key: 'org.dxos.function.tasks.taskCreate' })],
        [owner('codeProject', ['org.dxos.function.tasks.taskCreate'])],
        [],
      );
      expect(projected.toolName).to.equal('taskCreate');
      expect(projected.mutation).to.be.undefined;
    });

    test('a versioned key and its unversioned ToolId still join', ({ expect }) => {
      const [projected] = Projection.projectOperations(
        [record({ key: 'dxn:org.dxos.function.tasks.taskCreate:0.1.0', mutation: 'write' })],
        [owner('codeProject', ['org.dxos.function.tasks.taskCreate'])],
        [],
      );
      expect(projected.toolName).to.equal('taskCreate');
    });

    test('the mutation annotation rides through, one value per class', ({ expect }) => {
      const projected = Projection.projectOperations(
        [
          record({ key: 'org.dxos.a.query', mutation: 'none' }),
          record({ key: 'org.dxos.a.update', mutation: 'write' }),
          record({ key: 'org.dxos.a.remove', mutation: 'destructive' }),
        ],
        [owner('database', ['org.dxos.a.query', 'org.dxos.a.update', 'org.dxos.a.remove'])],
        [],
      );
      expect(projected.map((operation) => operation.mutation)).to.deep.equal(['none', 'write', 'destructive']);
    });

    test('requiresSpace reads Database.Service from the declared services', ({ expect }) => {
      const projected = Projection.projectOperations(
        [
          record({ key: 'org.dxos.a.declared', services: [Projection.DATABASE_SERVICE_KEY] }),
          record({ key: 'org.dxos.a.spaceless' }),
        ],
        [owner('database', ['org.dxos.a.declared', 'org.dxos.a.spaceless'])],
        [],
      );
      expect(projected.map((operation) => operation.requiresSpace)).to.deep.equal([true, false]);
    });

    test("the tool name defaults to the key's final segment, and `dxn:` is stripped", ({ expect }) => {
      const [projected] = Projection.projectOperations(
        [record({ key: 'dxn:org.dxos.function.tasks.taskComplete', mutation: 'write' })],
        [owner('codeProject', ['org.dxos.function.tasks.taskComplete'])],
        [],
      );
      expect(projected.toolName).to.equal('taskComplete');
      expect(projected.key).to.equal('org.dxos.function.tasks.taskComplete');
    });

    test('a key segment violating the tool-name constraint is skipped rather than advertised', ({ expect }) => {
      // Over the 64-char budget the client's `mcp__<server>__` prefix shares.
      const segment = 'a'.repeat(65);
      const projected = Projection.projectOperations(
        [record({ key: `org.dxos.function.tasks.${segment}` })],
        [owner('codeProject', [`org.dxos.function.tasks.${segment}`])],
        [],
      );
      expect(projected).to.have.length(0);
    });

    test('an undecodable mutation degrades to no hints rather than hiding the tool', ({ expect }) => {
      const [projected] = Projection.projectOperations(
        [record({ key: 'org.dxos.function.tasks.taskCreate', mutation: 'sideways' })],
        [owner('codeProject', ['org.dxos.function.tasks.taskCreate'])],
        [],
      );
      expect(projected.toolName).to.equal('taskCreate');
      expect(projected.mutation).to.be.undefined;
    });

    test('membership appends the load-first pointer to the description', ({ expect }) => {
      const [projected] = Projection.projectOperations(
        [record({ key: 'org.dxos.function.projects.projectCreate', description: 'Creates a project.' })],
        [owner('codeProject', ['org.dxos.function.projects.projectCreate'])],
        [],
      );
      expect(projected.description).to.include('Creates a project.');
      expect(projected.description).to.include("skillLoad('codeProject')");
      expect(projected.skills).to.deep.equal(['codeProject']);
    });

    test('an operation shared by two skills names both workflows', ({ expect }) => {
      const [projected] = Projection.projectOperations(
        [record({ key: 'org.dxos.function.tasks.taskCreate', description: 'Creates a task.' })],
        [
          owner('codeProject', ['org.dxos.function.tasks.taskCreate']),
          owner('inbox', ['org.dxos.function.tasks.taskCreate']),
        ],
        [],
      );
      expect(projected.description).to.include("'codeProject' and 'inbox' workflows");
      expect(projected.skills).to.deep.equal(['codeProject', 'inbox']);
    });

    test('a name collision with a static tool fails loudly, naming both claimants', ({ expect }) => {
      expect(() =>
        Projection.projectOperations(
          [record({ key: 'org.dxos.function.objects.createObject' })],
          [owner('database', ['org.dxos.function.objects.createObject'])],
          ['createObject'],
        ),
      ).to.throw(/createObject.*<static tool>.*org.dxos.function.objects.createObject/s);
    });

    test('two operations claiming one tool name fail loudly', ({ expect }) => {
      expect(() =>
        Projection.projectOperations(
          [record({ key: 'org.dxos.function.tasks.create' }), record({ key: 'org.dxos.function.projects.create' })],
          [owner('codeProject', ['org.dxos.function.tasks.create', 'org.dxos.function.projects.create'])],
          [],
        ),
      ).to.throw(/name collision/);
    });
  });

  describe('ref parameters', () => {
    const projectRef = () =>
      Projection.projectOperations(
        [
          record({
            key: 'org.dxos.function.tasks.create',
            properties: { taskSet: { allOf: [REF_SCHEMA], description: 'Owning task set.' } },
          }),
        ],
        [owner('codeProject', ['org.dxos.function.tasks.create'])],
        [],
      )[0];

    test('a ref argument decodes whether it arrives as an object or JSON-stringified', async ({ expect }) => {
      const parameters = Schema.Struct(projectRef().parameters);
      const envelope = { '/': 'echo://BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/01J000000000000000000000000' };

      const structured = await EffectEx.runPromise(Schema.decodeUnknownEffect(parameters)({ taskSet: envelope }));
      const stringified = await EffectEx.runPromise(
        Schema.decodeUnknownEffect(parameters)({ taskSet: JSON.stringify(envelope) }),
      );
      expect(JSON.stringify(structured)).to.equal(JSON.stringify(stringified));
    });

    test('a ref argument that is neither an envelope nor JSON is still a decode failure', async ({ expect }) => {
      const parameters = Schema.Struct(projectRef().parameters);
      const result = await EffectEx.runPromise(
        Effect.result(Schema.decodeUnknownEffect(parameters)({ taskSet: 'not a ref' })),
      );
      expect(result._tag).to.equal('Failure');
    });
  });

  describe('projectSkills', () => {
    test('only opted-in skills project, named by the key final segment', ({ expect }) => {
      const projected = Projection.projectSkills(
        [
          skill({
            key: 'org.dxos.plugin.projects.skill.codeProject',
            instructions: 'Do it well.',
            mcpPrompt: true,
          }),
          skill({ key: 'org.dxos.plugin.inbox.skill.calendar', instructions: 'Not for MCP.' }),
        ],
        [],
      );
      expect(projected.map((entry) => entry.promptName)).to.deep.equal(['codeProject']);
      expect(projected[0].instructions).to.equal('Do it well.');
      expect(projected[0].tools).to.deep.equal([]);
    });

    test('the tools list rides through, deciding the operation projection', ({ expect }) => {
      const projected = Projection.projectSkills(
        [
          skill({
            key: 'org.dxos.skill.database',
            instructions: 'Query first.',
            mcpPrompt: true,
            tools: ['org.dxos.function.space.addObject'],
          }),
        ],
        [],
      );
      expect(projected[0].tools).to.deep.equal(['org.dxos.function.space.addObject']);
    });

    test('a skill without instructions is not projected', ({ expect }) => {
      const projected = Projection.projectSkills(
        [skill({ key: 'org.dxos.plugin.projects.skill.codeProject', mcpPrompt: true })],
        [],
      );
      expect(projected).to.have.length(0);
    });

    test('a prompt name collision fails loudly', ({ expect }) => {
      expect(() =>
        Projection.projectSkills(
          [
            skill({ key: 'org.dxos.plugin.a.skill.codeProject', instructions: 'A', mcpPrompt: true }),
            skill({ key: 'org.dxos.plugin.b.skill.codeProject', instructions: 'B', mcpPrompt: true }),
          ],
          [],
        ),
      ).to.throw(/prompt name collision/);
    });
  });
});
