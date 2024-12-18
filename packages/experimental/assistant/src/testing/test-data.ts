//
// Copyright 2024 DXOS.org
//

import { type Schema as S } from '@effect/schema';

import { raise } from '@dxos/debug';
import { JSON_SCHEMA_ECHO_REF_ID, ObjectId, toJsonSchema, type JsonSchemaType, type Ref } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { makeRef } from '@dxos/live-object';

import {
  type DataSource,
  type Node,
  type Relationship,
  formatInferredRelationshipLabel,
  formatNodeLabel,
} from '../cypher';
import { Contact, Org, Project, Task } from '../testing';

// TODO(burdon): Use schema/testing.
export const createTestData = (): MockDataSource => {
  const dataSource = new MockDataSource();

  const contactRich = dataSource.add(Contact, {
    id: ObjectId.random(),
    name: 'Rich',
  });
  const contactJosiah = dataSource.add(Contact, {
    id: ObjectId.random(),
    name: 'Josiah',
  });
  const contactDima = dataSource.add(Contact, {
    id: ObjectId.random(),
    name: 'Dima',
  });
  const contactFred = dataSource.add(Contact, {
    id: ObjectId.random(),
    name: 'Fred',
  });

  const projectComposer = dataSource.add(Project, {
    id: ObjectId.random(),
    name: 'Composer',
  });
  const projectEcho = dataSource.add(Project, {
    id: ObjectId.random(),
    name: 'ECHO',
  });
  const projectDoodles = dataSource.add(Project, {
    id: ObjectId.random(),
    name: 'Doodles',
  });

  const _taskComposer1 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Optimize startup performance',
    project: makeRef(projectComposer),
    assignee: makeRef(contactJosiah),
  });
  const _taskComposer2 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Create form builder',
    project: makeRef(projectComposer),
    assignee: makeRef(contactRich),
  });
  const _taskComposer3 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Add support for custom themes',
    project: makeRef(projectComposer),
    assignee: makeRef(contactJosiah),
  });
  const _taskComposer5 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Implement community plugin',
    project: makeRef(projectComposer),
    assignee: makeRef(contactFred),
  });
  const _taskComposer4 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Implement dark mode',
    project: makeRef(projectComposer),
    assignee: makeRef(contactRich),
  });
  const _taskEcho1 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Implement cypher query engine',
    project: makeRef(projectEcho),
    assignee: makeRef(contactDima),
  });
  const _taskEcho2 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Add schema editor',
    project: makeRef(projectEcho),
    assignee: makeRef(contactRich),
  });
  const _taskDoodles1 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Add support for custom themes',
    project: makeRef(projectDoodles),
    assignee: makeRef(contactFred),
  });
  const _taskDoodles2 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Implement dark mode',
    project: makeRef(projectDoodles),
    assignee: makeRef(contactJosiah),
  });

  const _orgDxos = dataSource.add(Org, {
    id: ObjectId.random(),
    name: 'DXOS',
    employees: [makeRef(contactRich), makeRef(contactJosiah), makeRef(contactDima)],
    projects: [makeRef(projectEcho)],
  });
  const _orgBraneframe = dataSource.add(Org, {
    id: ObjectId.random(),
    name: 'Braneframe',
    employees: [makeRef(contactJosiah), makeRef(contactRich)],
    projects: [makeRef(projectComposer)],
  });
  dataSource.computeGraph();

  return dataSource;
};

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
      data,
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

          const { id: targetId } = (object.data as any)[name].target;

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

          for (const { id: targetId } of (object.data as any)[name].map((x: Ref<any>) => x.target)) {
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
