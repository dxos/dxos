import { EchoDatabase, Filter, type ReactiveEchoObject } from '@dxos/echo-db';
import type { DataSource, Node, Relationship } from './query-executor';
import { log } from '@dxos/log';
import { getSchemaDXN, getSchemaTypename, StoredSchema, toJsonSchema } from '@dxos/echo-schema';
import { getSchema } from '@dxos/live-object';
import { formatInferredRelationshipLabel, formatNodeLabel, isReference } from './schema';
import { raise } from '@dxos/debug';

export class EchoDataSource implements DataSource {
  constructor(private readonly _db: EchoDatabase) {}

  async getNodes({ label }: { label?: string }): Promise<Node[]> {
    if (!label) {
      const { objects } = await this._db.query().run();
      return objects.map(this._objectToNode);
    }

    const schema = this._db.graph.schemaRegistry.schemas.find((s) => getSchemaTypename(s)?.endsWith(label));

    if (!schema) {
      return [];
    }

    const { objects } = await this._db.query(Filter.schema(schema)).run();
    return objects.map(this._objectToNode);
  }

  async getRelationships({ label }: { label?: string }): Promise<Relationship[]> {
    const syntheticRefRelationships = this._db.graph.schemaRegistry.schemas
      .filter((schema) => getSchemaTypename(schema) !== StoredSchema.typename)
      .flatMap((schema) => {
        const jsonSchema = toJsonSchema(schema);
        const relationships = Object.entries(jsonSchema.properties!).filter(([key, prop]) => isReference(prop));

        return relationships.map(([key, value]) => {
          const relationshipLabel = formatInferredRelationshipLabel(
            jsonSchema.$id ?? raise(new Error('Schema must have $id')),
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

    const { objects } = await this._db.query(Filter.schema(relationship.schema)).run();
    return (
      await Promise.all(objects.map((object) => this._projectRefRelationship(object, relationship.property)))
    ).flat();
  }

  private _objectToNode(object: ReactiveEchoObject<any>): Node {
    const { id, ...properties } = object;
    return {
      id,
      kind: 'node',
      label: formatNodeLabel(getSchemaDXN(getSchema(object)!)!.toString()),
      properties,
    };
  }

  private async _projectRefRelationship(object: ReactiveEchoObject<any>, prop: string): Promise<Relationship[]> {
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
          label: formatInferredRelationshipLabel(getSchemaDXN(getSchema(object)!)!.toString(), prop),
          properties: {},
          source: this._objectToNode(object),
          target: this._objectToNode(target),
        };
      }),
    );
  }
}
