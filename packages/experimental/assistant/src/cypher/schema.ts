import { raise } from '@dxos/debug';
import { JSON_SCHEMA_ECHO_REF_ID, JsonSchemaType } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { trim } from '../common/trim';

/**
 * Formats ECHO schema to be consumed by LLM.
 * Schema is formatted in cypher format.
 * Objects are represented as nodes.
 * References are represented as relationships.
 */
export const formatJsonSchemaForLLM = (schemaTypes: JsonSchemaType[]): string[] => {
  return schemaTypes.flatMap((schema) => [formatNodeSchema(schema), ...formatInferredRelationships(schema)]);
};

const formatNodeSchema = (schema: JsonSchemaType) => {
  const label = formatNodeLabel(schema.$id ?? raise(new Error('Schema must have $id')));
  const properties = Object.entries(schema.properties!).filter(([key, prop]) => key !== 'id' && !isReference(prop));

  return trim`
    <node>
      (:${label})

      <description>${schema.description}</description>

      <properties>
        ${properties.map(([key, value]) => {
          return trim`
            <${key}>
              <type>${value.type}</type>
              <description>${value.description}</description>
            </${key}>
          `;
        })}
      </properties>
    </node>
  `;
};

const formatInferredRelationships = (schema: JsonSchemaType): string[] => {
  const nodeLabel = formatNodeLabel(schema.$id ?? raise(new Error('Schema must have $id')));
  const relationships = Object.entries(schema.properties!).filter(([key, prop]) => isReference(prop));

  return relationships.map(([key, value]) => {
    const relationshipLabel = formatInferredRelationshipLabel(
      schema?.$id ?? raise(new Error('Schema must have $id')),
      key,
    );

    const target = value.reference?.schema.$ref;
    const targetLabel = target ? formatNodeLabel(target) : '';

    return trim`
      <relationship>
        (:${nodeLabel})-[:${relationshipLabel}]->(:${targetLabel})

        <description>${value.description}</description>
      </relationship>
    `;
  });
};

export const formatNodeLabel = (typenameDxn: string) => {
  const {
    parts: [typename],
  } = DXN.parse(typenameDxn);
  return typename.replace(/^example\.com\/type\//g, '');
};

export const formatInferredRelationshipLabel = (typenameDxn: string, property: string) => {
  const nodeLabel = formatNodeLabel(typenameDxn);
  return `${nodeLabel}_${property}`.toUpperCase();
};

const isReference = (schema: JsonSchemaType) =>
  schema.$id === JSON_SCHEMA_ECHO_REF_ID || (schema.type === 'array' && schema.items?.$id === JSON_SCHEMA_ECHO_REF_ID);
