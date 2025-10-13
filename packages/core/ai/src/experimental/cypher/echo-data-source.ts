//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { raise } from '@dxos/debug';
import { StoredSchema, getSchema, getSchemaTypename, toJsonSchema } from '@dxos/echo/internal';
import { type AnyLiveObject, type EchoDatabase, Filter } from '@dxos/echo-db';
import { log } from '@dxos/log';

import type { DataSource, Node, Relationship } from './query-executor';
import { formatInferredRelationshipLabel, formatNodeLabel, isReference } from './schema';

export class EchoDataSource implements DataSource {
  constructor(private readonly _db: EchoDatabase) {}

  @log.method()
  async getNodes({ label }: { label?: string }): Promise<Node[]> {
    if (!label) {
      const { objects } = await this._db.query(Filter.everything()).run();
      return objects.map(this._objectToNode);
    }

    const schema = (await this._getAllSchema()).find((schema) => getSchemaTypename(schema)?.endsWith(label));
    if (!schema) {
      return [];
    }

    const { objects } = await this._db.query(Filter.type(schema)).run();
    return objects.map(this._objectToNode);
  }

  @log.method()
  async getRelationships({ label }: { label?: string }): Promise<Relationship[]> {
    const syntheticRefRelationships = (await this._getAllSchema())
      .filter((schema) => getSchemaTypename(schema) !== StoredSchema.typename)
      .flatMap((schema) => {
        const jsonSchema = toJsonSchema(schema);
        const relationships = Object.entries(jsonSchema.properties!).filter(([key, prop]) => isReference(prop));

        return relationships.map(([key, value]) => {
          const relationshipLabel = formatInferredRelationshipLabel(
            jsonSchema.typename ?? raise(new Error('Schema must have typename')),
            key,
          );

          return {
            label: relationshipLabel,
            schema,
            property: key,
          };
        });
      });
    const relationship = syntheticRefRelationships.find((r) => r.label === label);
    if (!relationship) {
      return []; // TODO(dmaretskyi): Handle real relationships.
    }

    const { objects } = await this._db.query(Filter.type(relationship.schema)).run();
    return (
      await Promise.all(objects.map((object) => this._projectRefRelationship(object, relationship.property)))
    ).flat();
  }

  private async _getAllSchema(): Promise<Schema.Schema.AnyNoContext[]> {
    return [
      ...(await this._db.schemaRegistry.query().run()),
      // TODO(dmaretskyi): Remove once we can serialize recursive schema.
      ...this._db.graph.schemaRegistry.schemas.filter((schema) => getSchemaTypename(schema)?.startsWith('example.org')),
    ].filter((schema) => getSchemaTypename(schema) !== StoredSchema.typename);
  }

  private _objectToNode(object: AnyLiveObject<any>): Node {
    const { id, ...properties } = object;
    return {
      id,
      kind: 'node',
      label: formatNodeLabel(getSchemaTypename(getSchema(object)!)!),
      properties,
    };
  }

  private async _projectRefRelationship(object: AnyLiveObject<any>, prop: string): Promise<Relationship[]> {
    if (!object[prop]) {
      return [];
    }

    const value = Array.isArray(object[prop]) ? object[prop] : [object[prop]];

    return Promise.all(
      value.map(async (ref): Promise<Relationship> => {
        const target = await ref.load();
        return {
          id: `${object.id}-${prop}-${target.id}`,
          kind: 'relationship',
          label: formatInferredRelationshipLabel(getSchemaTypename(getSchema(object)!)!, prop),
          properties: {},
          source: this._objectToNode(object),
          target: this._objectToNode(target),
        };
      }),
    );
  }
}
