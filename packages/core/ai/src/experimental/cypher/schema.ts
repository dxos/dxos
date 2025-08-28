//
// Copyright 2024 DXOS.org
//

import { raise } from '@dxos/debug';
import { JSON_SCHEMA_ECHO_REF_ID, type JsonSchemaType } from '@dxos/echo/internal';
import { trim } from '@dxos/util';

/**
 * Formats ECHO schema to be consumed by LLM.
 * Schema is formatted in cypher format.
 * Objects are represented as nodes.
 * References are represented as relationships.
 */
export const formatJsonSchemaForLLM = (schemaTypes: JsonSchemaType[]): string[] => {
  return schemaTypes.flatMap((schema) => [
    formatNodeSchema(schema),
    ...formatInferredRelationships(schema, schemaTypes),
  ]);
};

const formatNodeSchema = (schema: JsonSchemaType) => {
  const label = formatNodeLabel(schema.typename ?? raise(new Error('Schema must have $id')));
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

const formatInferredRelationships = (schema: JsonSchemaType, allSchema: JsonSchemaType[]): string[] => {
  const nodeLabel = formatNodeLabel(schema.typename ?? raise(new Error('Schema must have $id')));
  const relationships = Object.entries(schema.properties!).filter(([key, prop]) => isReference(prop));

  return relationships.map(([key, value]) => {
    const relationshipLabel = formatInferredRelationshipLabel(
      schema.typename ?? raise(new Error('Schema must have $id')),
      key,
    );

    // TODO(dmaretskyi): Registered schema don't get reference types updated.
    const targetSchema = allSchema.find((schema) => `dxn:type/${schema.typename}` === value.reference?.schema.$ref);
    const targetLabel = targetSchema ? formatNodeLabel(targetSchema?.typename ?? '') : '';

    return trim`
      <relationship>
        (:${nodeLabel})-[:${relationshipLabel}]->(:${targetLabel})

        <description>${value.description}</description>
      </relationship>
    `;
  });
};

export const formatNodeLabel = (typename: string) => {
  return typename.replace(/^example\.com\/type\//g, '');
};

export const formatInferredRelationshipLabel = (typename: string, property: string) => {
  const nodeLabel = formatNodeLabel(typename);
  return `${nodeLabel}_${property}`.toUpperCase();
};

export const isReference = (schema: JsonSchemaType) =>
  schema.$id === JSON_SCHEMA_ECHO_REF_ID ||
  (schema.type === 'array' &&
    !Array.isArray(schema.items) &&
    typeof schema.items === 'object' &&
    '$id' in schema.items &&
    schema.items.$id === JSON_SCHEMA_ECHO_REF_ID);
