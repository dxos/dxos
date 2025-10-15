//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import {
  JSON_SCHEMA_ECHO_REF_ID,
  type JsonSchemaType,
  ObjectId,
  type Ref,
  Ref as RefImpl,
  toJsonSchema,
} from '@dxos/echo/internal';
import { live } from '@dxos/echo/internal';
import type { EchoDatabase } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';

import {
  type DataSource,
  type Node,
  type Relationship,
  formatInferredRelationshipLabel,
  formatNodeLabel,
} from '../experimental/cypher';

import { Contact, Organization, Project, Task } from './test-schema';

export const seedTestData = (db: EchoDatabase) => {
  const contactRich = db.add(
    live(Contact, {
      name: 'Rich',
    }),
  );
  const contactJosiah = db.add(
    live(Contact, {
      name: 'Josiah',
    }),
  );
  const contactDima = db.add(
    live(Contact, {
      name: 'Dima',
    }),
  );
  const contactFred = db.add(
    live(Contact, {
      name: 'Fred',
    }),
  );

  const projectComposer = db.add(
    live(Project, {
      name: 'Composer',
    }),
  );
  const projectEcho = db.add(
    live(Project, {
      name: 'ECHO',
    }),
  );
  const projectDoodles = db.add(
    live(Project, {
      name: 'Doodles',
    }),
  );

  const _taskComposer1 = db.add(
    live(Task, {
      name: 'Optimize startup performance',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactJosiah),
    }),
  );
  const _taskComposer2 = db.add(
    live(Task, {
      name: 'Create form builder',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactRich),
    }),
  );
  const _taskComposer3 = db.add(
    live(Task, {
      name: 'Add support for custom themes',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactJosiah),
    }),
  );
  const _taskComposer5 = db.add(
    live(Task, {
      name: 'Implement community plugin',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactFred),
    }),
  );
  const _taskComposer4 = db.add(
    live(Task, {
      name: 'Implement dark mode',
      project: RefImpl.make(projectComposer),
      assignee: RefImpl.make(contactRich),
    }),
  );
  const _taskEcho1 = db.add(
    live(Task, {
      name: 'Implement cypher query engine',
      project: RefImpl.make(projectEcho),
      assignee: RefImpl.make(contactDima),
    }),
  );
  const _taskEcho2 = db.add(
    live(Task, {
      name: 'Add schema editor',
      project: RefImpl.make(projectEcho),
      assignee: RefImpl.make(contactRich),
    }),
  );
  const _taskDoodles1 = db.add(
    live(Task, {
      name: 'Add support for custom themes',
      project: RefImpl.make(projectDoodles),
      assignee: RefImpl.make(contactFred),
    }),
  );
  const _taskDoodles2 = db.add(
    live(Task, {
      name: 'Implement dark mode',
      project: RefImpl.make(projectDoodles),
      assignee: RefImpl.make(contactJosiah),
    }),
  );

  const _orgDxos = db.add(
    live(Organization, {
      name: 'DXOS',
      employees: [RefImpl.make(contactRich), RefImpl.make(contactJosiah), RefImpl.make(contactDima)],
      projects: [RefImpl.make(projectEcho)],
    }),
  );
  const _orgBraneframe = db.add(
    live(Organization, {
      name: 'Braneframe',
      employees: [RefImpl.make(contactJosiah), RefImpl.make(contactRich)],
      projects: [RefImpl.make(projectComposer)],
    }),
  );
};

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
    project: RefImpl.make(projectComposer),
    assignee: RefImpl.make(contactJosiah),
  });
  const _taskComposer2 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Create form builder',
    project: RefImpl.make(projectComposer),
    assignee: RefImpl.make(contactRich),
  });
  const _taskComposer3 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Add support for custom themes',
    project: RefImpl.make(projectComposer),
    assignee: RefImpl.make(contactJosiah),
  });
  const _taskComposer5 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Implement community plugin',
    project: RefImpl.make(projectComposer),
    assignee: RefImpl.make(contactFred),
  });
  const _taskComposer4 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Implement dark mode',
    project: RefImpl.make(projectComposer),
    assignee: RefImpl.make(contactRich),
  });
  const _taskEcho1 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Implement cypher query engine',
    project: RefImpl.make(projectEcho),
    assignee: RefImpl.make(contactDima),
  });
  const _taskEcho2 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Add schema editor',
    project: RefImpl.make(projectEcho),
    assignee: RefImpl.make(contactRich),
  });
  const _taskDoodles1 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Add support for custom themes',
    project: RefImpl.make(projectDoodles),
    assignee: RefImpl.make(contactFred),
  });
  const _taskDoodles2 = dataSource.add(Task, {
    id: ObjectId.random(),
    name: 'Implement dark mode',
    project: RefImpl.make(projectDoodles),
    assignee: RefImpl.make(contactJosiah),
  });

  const _orgDxos = dataSource.add(Organization, {
    id: ObjectId.random(),
    name: 'DXOS',
    employees: [RefImpl.make(contactRich), RefImpl.make(contactJosiah), RefImpl.make(contactDima)],
    projects: [RefImpl.make(projectEcho)],
  });
  const _orgBraneframe = dataSource.add(Organization, {
    id: ObjectId.random(),
    name: 'Braneframe',
    employees: [RefImpl.make(contactJosiah), RefImpl.make(contactRich)],
    projects: [RefImpl.make(projectComposer)],
  });
  dataSource.computeGraph();

  return dataSource;
};

export class MockDataSource implements DataSource {
  objects: Record<
    string,
    {
      schema: Schema.Schema.All;
      typeDxn: string;
      id: string;
      data: unknown;
    }
  > = {};

  schema: Record<
    string,
    {
      json: JsonSchemaType;
      instance: Schema.Schema.All;
    }
  > = {};

  nodes: Node[] = [];
  relationships: Relationship[] = [];

  async getNodes({ label }: { label?: string }): Promise<Node[]> {
    return this.nodes.filter((node) => !label || node.label === label);
  }

  async getRelationships({ label }: { label?: string }): Promise<Relationship[]> {
    return this.relationships.filter((relationship) => !label || relationship.label === label);
  }

  add<S extends Schema.Schema.All>(schema: S, data: Schema.Schema.Type<S>): Schema.Schema.Type<S> {
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

  computeGraph(): void {
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
        } else if (
          propSchema.type === 'array' &&
          propSchema.items &&
          typeof propSchema.items === 'object' &&
          '$id' in propSchema.items &&
          propSchema.items.$id === JSON_SCHEMA_ECHO_REF_ID
        ) {
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
