//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
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
  annotation,
  description,
  properties,
}: {
  key: string;
  annotation?: Record<string, unknown>;
  description?: string;
  properties?: Record<string, unknown>;
}) => ({
  'name': key,
  description,
  '@meta': {
    key,
    annotations: annotation ? { [Projection.MCP_TOOL_ANNOTATION_ID]: annotation } : {},
  },
  ...(properties ? { inputSchema: { type: 'object', properties, required: Object.keys(properties) } } : {}),
});

const skill = (props: { key: string; instructions?: string; mcpPrompt?: boolean; description?: string }) => ({
  name: props.key,
  ...props,
});

describe('Projection', () => {
  describe('annotation contract', () => {
    test('the annotation id matches the one `Operation.mcpTool` writes', ({ expect }) => {
      expect(Projection.MCP_TOOL_ANNOTATION_ID).to.equal(Operation.McpToolAnnotation.key);
    });

    test('an operation annotated through `Operation.mcpTool` projects', ({ expect }) => {
      const operation = Operation.make({
        meta: { key: DXN.make('org.dxos.function.test.doThing'), name: 'Do thing' },
        input: Schema.Struct({ value: Schema.String }),
        output: Schema.Struct({ ok: Schema.Boolean }),
      }).pipe(Operation.mcpTool({ name: 'doThing', safety: 'write' }));

      const [projected] = Projection.projectOperations([Obj.toJSON(Operation.serialize(operation))], []);
      expect(projected.toolName).to.equal('doThing');
      expect(projected.safety).to.equal('write');
      expect(Object.keys(projected.parameters)).to.deep.equal(['value']);
    });
  });

  describe('projectOperations', () => {
    test('only annotated records project', ({ expect }) => {
      const projected = Projection.projectOperations(
        [
          record({ key: 'org.dxos.function.tasks.create', annotation: { name: 'taskCreate', safety: 'write' } }),
          record({ key: 'org.dxos.function.tasks.internal' }),
        ],
        [],
      );
      expect(projected.map((operation) => operation.toolName)).to.deep.equal(['taskCreate']);
    });

    test("the tool name defaults to the key's final segment, and `dxn:` is stripped", ({ expect }) => {
      const [projected] = Projection.projectOperations(
        [record({ key: 'dxn:org.dxos.function.tasks.taskComplete', annotation: { safety: 'write' } })],
        [],
      );
      expect(projected.toolName).to.equal('taskComplete');
      expect(projected.key).to.equal('org.dxos.function.tasks.taskComplete');
    });

    test('a name violating the tool-name constraint is skipped rather than advertised', ({ expect }) => {
      const projected = Projection.projectOperations(
        [record({ key: 'org.dxos.function.tasks.create', annotation: { name: 'task.create', safety: 'write' } })],
        [],
      );
      expect(projected).to.have.length(0);
    });

    test('an undecodable annotation is skipped', ({ expect }) => {
      const projected = Projection.projectOperations(
        [record({ key: 'org.dxos.function.tasks.create', annotation: { safety: 'sideways' } })],
        [],
      );
      expect(projected).to.have.length(0);
    });

    test('the description falls back to the record, and a skill appends the load-first pointer', ({ expect }) => {
      const [plain, governed] = Projection.projectOperations(
        [
          record({
            key: 'org.dxos.function.tasks.create',
            description: 'Creates a task.',
            annotation: { safety: 'write' },
          }),
          record({
            key: 'org.dxos.function.projects.create',
            annotation: {
              name: 'projectCreate',
              safety: 'write',
              description: 'Creates a project.',
              skill: 'codeProject',
            },
          }),
        ],
        [],
      );
      expect(plain.description).to.equal('Creates a task.');
      expect(governed.description).to.include('Creates a project.');
      expect(governed.description).to.include("skillLoad('codeProject')");
    });

    test('a name collision with a static tool fails loudly, naming both claimants', ({ expect }) => {
      expect(() =>
        Projection.projectOperations(
          [record({ key: 'org.dxos.function.objects.createObject', annotation: { safety: 'write' } })],
          ['createObject'],
        ),
      ).to.throw(/createObject.*<static tool>.*org.dxos.function.objects.createObject/s);
    });

    test('two operations claiming one tool name fail loudly', ({ expect }) => {
      expect(() =>
        Projection.projectOperations(
          [
            record({ key: 'org.dxos.function.tasks.create', annotation: { name: 'create', safety: 'write' } }),
            record({ key: 'org.dxos.function.projects.create', annotation: { name: 'create', safety: 'write' } }),
          ],
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
            annotation: { safety: 'write' },
            properties: { taskSet: { allOf: [REF_SCHEMA], description: 'Owning task set.' } },
          }),
        ],
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
          skill({ key: 'org.dxos.plugin.projects.skill.codeProject', instructions: 'Do it well.', mcpPrompt: true }),
          skill({ key: 'org.dxos.plugin.inbox.skill.calendar', instructions: 'Not for MCP.' }),
        ],
        [],
      );
      expect(projected.map((entry) => entry.promptName)).to.deep.equal(['codeProject']);
      expect(projected[0].instructions).to.equal('Do it well.');
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
