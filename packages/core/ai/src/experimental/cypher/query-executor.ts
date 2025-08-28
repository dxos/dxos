//
// Copyright 2024 DXOS.org
//

import type { JsonPath } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { mapValues } from '@dxos/util';

import { type ExecutionPlan, type VariableName, createExecutionPlan } from './execution-plan';
import { parseCypherQuery } from './parser';

export interface DataSource {
  getNodes: (params: { label?: string }) => Promise<Node[]>;
  getRelationships: (params: { label?: string }) => Promise<Relationship[]>;
}

export type Node = {
  id: string;
  kind: 'node';
  label: string;
  properties: Record<string, unknown>;
};

export type Relationship = {
  id: string;
  kind: 'relationship';
  label: string;
  properties: Record<string, unknown>;
  source: Node;
  target: Node;
};

export const executeQueryPlan = async (
  dataSource: DataSource,
  plan: ExecutionPlan,
): Promise<Record<string, unknown>[]> => {
  let buffer: Record<VariableName, Node | Relationship>[] = [];
  const results: Record<string, unknown>[] = [];

  for (const step of plan.steps) {
    log('begin step', { step });

    switch (step.type) {
      case 'NodeScan': {
        const nodes = await dataSource.getNodes({ label: step.label });
        buffer.push(...nodes.map((node) => ({ [step.into]: node })));
        break;
      }
      case 'FilterByLabel': {
        buffer = buffer.filter((item) => {
          const node = item[step.variable];
          return node && node.kind === 'node' && node.label === step.label;
        });
        break;
      }
      case 'FilterByProperty': {
        buffer = buffer.filter((item) => {
          const node = item[step.variable];
          return node && node.kind === 'node' && node.properties[step.property] === step.value;
        });
        break;
      }
      case 'RelationshipScan': {
        const relationships = await dataSource.getRelationships({ label: step.label });
        for (const tuple of [...buffer]) {
          if (tuple[step.anchor].kind !== 'node') {
            continue;
          }
          const filteredRelationships = relationships.filter((relationship) => {
            switch (step.direction) {
              case 'in':
                return relationship.target.id === tuple[step.anchor].id;
              case 'out':
                return relationship.source.id === tuple[step.anchor].id;
              case 'both':
                return (
                  relationship.source.id === tuple[step.anchor].id || relationship.target.id === tuple[step.anchor].id
                );
              default:
                throw new Error(`Unknown direction: ${step.direction}`);
            }
          });
          for (let i = 0; i < filteredRelationships.length; i++) {
            const relationship = filteredRelationships[i];
            const newTuple = i === 0 ? tuple : { ...tuple };
            if (newTuple !== tuple) {
              buffer.push(newTuple);
            }
            newTuple[step.relationshipInto] = relationship;
            switch (step.direction) {
              case 'in':
                newTuple[step.nodeInto] = relationship.source;
                break;
              case 'out':
                newTuple[step.nodeInto] = relationship.target;
                break;
              case 'both':
                newTuple[step.nodeInto] =
                  relationship.source.id === newTuple[step.anchor].id ? relationship.target : relationship.source;
                break;
            }
          }
        }
        break;
      }
      case 'ProduceResults': {
        for (const tuple of buffer) {
          const result: Record<string, unknown> = {};
          for (const field of step.fields) {
            result[field.name] = jsonPathGet(tuple[field.variable].properties, field.path);
          }
          results.push(result);
        }
        break;
      }
    }

    log('finish step', { buffer: buffer.map((tuple) => mapValues(tuple, (x) => x.id)), results });
  }

  return results;
};

export const executeQuery = (dataSource: DataSource, query: string): Promise<Record<string, unknown>[]> => {
  const plan = createExecutionPlan(parseCypherQuery(query));
  return executeQueryPlan(dataSource, plan);
};

// TODO(dmaretskyi): Extract.
const jsonPathGet = (obj: Record<string, unknown>, path: JsonPath): unknown => {
  if (path === '' || path === '$') {
    return obj;
  }

  const parts = path.split('.');
  if (parts[0] === '$') {
    parts.shift();
  }

  let result: any = obj;
  for (const part of parts) {
    result = result?.[part];
  }
  return result;
};
