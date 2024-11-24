import { raise } from '@dxos/debug';
import { JSON_SCHEMA_ECHO_REF_ID, toJsonSchema, type JsonSchemaType } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Schema as S } from '@effect/schema';
import { executeQuery, type DataSource, type Node, type Relationship } from './query-executor';
import { formatInferredRelationshipLabel, formatNodeLabel } from './schema';
import { test } from 'vitest';
import { Contact, Org, Project, Task } from '../test/test-schema';
import { log } from '@dxos/log';
import type { label } from './combinators';

test('run', async ({ expect }) => {
  const dataSource = new MockDataSource();

  const contactRich = dataSource.add(Contact, {
    id: 'contact-rich',
    name: 'Rich',
  });
  const contactJosiah = dataSource.add(Contact, {
    id: 'contact-josiah',
    name: 'Josiah',
  });
  const contactDima = dataSource.add(Contact, {
    id: 'contact-dima',
    name: 'Dima',
  });
  const contactFred = dataSource.add(Contact, {
    id: 'contact-fred',
    name: 'John',
  });

  const projectComposer = dataSource.add(Project, {
    id: 'project-composer',
    name: 'Composer',
  });
  const projectEcho = dataSource.add(Project, {
    id: 'project-echo',
    name: 'ECHO',
  });
  const projectDoodles = dataSource.add(Project, {
    id: 'project-doodles',
    name: 'Doodles',
  });

  const taskComposer1 = dataSource.add(Task, {
    id: 'task-1',
    name: 'Optimize startup performance',
    project: projectComposer,
    assignee: contactJosiah,
  });
  const taskComposer2 = dataSource.add(Task, {
    id: 'task-2',
    name: 'Create form builder',
    project: projectComposer,
    assignee: contactRich,
  });
  const taskComposer3 = dataSource.add(Task, {
    id: 'task-3',
    name: 'Add support for custom themes',
    project: projectComposer,
    assignee: contactJosiah,
  });
  const taskComposer4 = dataSource.add(Task, {
    id: 'task-8',
    name: 'Implement dark mode',
    project: projectComposer,
    assignee: contactRich,
  });
  const taskEcho1 = dataSource.add(Task, {
    id: 'task-4',
    name: 'Implement cypher query engine',
    project: projectEcho,
    assignee: contactDima,
  });
  const taskEcho2 = dataSource.add(Task, {
    id: 'task-5',
    name: 'Add schema editor',
    project: projectEcho,
    assignee: contactRich,
  });
  const taskDoodles1 = dataSource.add(Task, {
    id: 'task-6',
    name: 'Add support for custom themes',
    project: projectDoodles,
    assignee: contactFred,
  });
  const taskDoodles2 = dataSource.add(Task, {
    id: 'task-7',
    name: 'Implement dark mode',
    project: projectDoodles,
    assignee: contactJosiah,
  });

  const orgDxos = dataSource.add(Org, {
    id: 'org-dxos',
    name: 'DXOS',
    employees: [contactRich, contactDima],
    projects: [projectEcho],
  });
  const orgBraneframe = dataSource.add(Org, {
    id: 'org-braneframe',
    name: 'Braneframe',
    employees: [contactJosiah, contactRich],
    projects: [projectComposer],
  });
  dataSource.computeGraph();

  // for (const node of dataSource.nodes) {
  //   log.info('node', { id: node.id, label: node.label, name: node.properties.name });
  // }
  // for (const relationship of dataSource.relationships) {
  //   log.info('relationship', {
  //     source: relationship.source.id,
  //     target: relationship.target.id,
  //     label: relationship.label,
  //   });
  // }

  const result = await executeQuery(
    dataSource,
    `
      MATCH (org:Org {name: 'DXOS'})-[:ORG_EMPLOYEES]->(c:Contact)<-[:TASK_ASSIGNEE]-(t:Task)-[:TASK_PROJECT]->(p:Project {name: 'Composer'})
      RETURN c.name, t.name
    `,
  );

  expect(result).toEqual([
    { c_name: 'Rich', t_name: 'Create form builder' },
    { c_name: 'Rich', t_name: 'Implement dark mode' },
  ]);

  log.info('result', { result });
});

export class MockDataSource implements DataSource {
  objects: Record<
    string,
    {
      schema: S.Schema.All;
      typeDxn: string;
      id: string;
      data: unknown;
    }
  > = {};
  schema: Record<
    string,
    {
      json: JsonSchemaType;
      instance: S.Schema.All;
    }
  > = {};

  nodes: Node[] = [];
  relationships: Relationship[] = [];

  async getNodes({ label }: { label?: string }) {
    return this.nodes.filter((node) => !label || node.label === label);
  }

  async getRelationships({ label }: { label?: string }) {
    return this.relationships.filter((relationship) => !label || relationship.label === label);
  }

  add<S extends S.Schema.All>(schema: S, data: S.Schema.Type<S>) {
    invariant(typeof data.id === 'string', 'Data must have an id');
    const jsonSchema = toJsonSchema(schema);
    if (!this.schema[jsonSchema.$id!]) {
      this.schema[jsonSchema.$id!] = {
        json: jsonSchema,
        instance: schema,
      };
    }

    const typenameDxn = jsonSchema.$id ?? raise(new Error('Schema must have $id'));

    this.objects[data.id] = {
      schema,
      id: data.id,
      typeDxn: typenameDxn,
      data: data,
    };

    return data;
  }

  computeGraph() {
    this.nodes = [];
    this.relationships = [];

    for (const object of Object.values(this.objects)) {
      this.nodes.push({
        kind: 'node',
        id: object.id,
        label: formatNodeLabel(object.typeDxn),
        properties: object.data as any,
      });
    }

    for (const object of Object.values(this.objects)) {
      const schema = this.schema[object.typeDxn].json;
      const typenameDxn = schema.$id ?? raise(new Error('Schema must have $id'));

      for (const [name, propSchema] of Object.entries(schema.properties!)) {
        if (propSchema.$id === JSON_SCHEMA_ECHO_REF_ID) {
          const label = formatInferredRelationshipLabel(typenameDxn, name);

          const source = this.nodes.find((node) => node.id === object.id);
          if (!source) {
            continue;
          }

          const { id: targetId } = (object.data as any)[name];

          const target = this.nodes.find((node) => node.id === targetId);
          if (!target) {
            continue;
          }

          this.relationships.push({
            kind: 'relationship',
            id: `${object.id}-${name}-${target.id}`,
            label,
            properties: {},
            source,
            target,
          });
        } else if (propSchema.type === 'array' && propSchema.items?.$id === JSON_SCHEMA_ECHO_REF_ID) {
          const label = formatInferredRelationshipLabel(typenameDxn, name);

          const source = this.nodes.find((node) => node.id === object.id);
          if (!source) {
            continue;
          }

          for (const { id: targetId } of (object.data as any)[name]) {
            const target = this.nodes.find((node) => node.id === targetId);
            if (!target) {
              continue;
            }

            this.relationships.push({
              kind: 'relationship',
              id: `${object.id}-${name}-${targetId}`,
              label,
              properties: {},
              source,
              target,
            });
          }
        }
      }
    }
  }
}
