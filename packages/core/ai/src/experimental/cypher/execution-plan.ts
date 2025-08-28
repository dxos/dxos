//
// Copyright 2024 DXOS.org
//

import type { JsonPath } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { GraphPatternConnector, MatchClause, ReturnClause, WhereClause } from './ast';
import type { ParsedQuery } from './parser';

export type VariableName = string & { __VariableName: never };

export type ExecutionPlanStep =
  | {
      type: 'NodeScan';
      label: string;
      into: VariableName;
    }
  | {
      type: 'FilterByLabel';
      variable: VariableName;
      label: string;
    }
  | {
      type: 'FilterByProperty';
      variable: VariableName;
      property: JsonPath;
      value: unknown;
    }
  | {
      /**
       * Scans (anchor)-[relationshipInto:label]->(nodeInto).
       */
      type: 'RelationshipScan';
      label: string;
      anchor: VariableName;
      relationshipInto: VariableName;
      nodeInto: VariableName;

      /**
       * `in`: (anchor)<-[relationshipInto:label]-(nodeInto)
       * `out`: (anchor)-[relationshipInto:label]->(nodeInto)
       * `both`: (anchor)-[relationshipInto:label]-(nodeInto)
       */
      direction: 'in' | 'out' | 'both';
    }
  | {
      type: 'ProduceResults';
      fields: {
        name: string;
        variable: VariableName;
        path: JsonPath;
      }[];
    };

export type ExecutionPlan = {
  steps: ExecutionPlanStep[];
  output: {
    fields: string[];
  };
};

export const createExecutionPlan = (query: ParsedQuery): ExecutionPlan => {
  return new ExecutionPlanBuilder().build(query);
};

class ExecutionPlanBuilder {
  private counter = 0;

  newVariable(): VariableName {
    return `anon_${this.counter++}` as VariableName;
  }

  build(query: ParsedQuery): ExecutionPlan {
    log('Creating execution plan for query', { query });
    return {
      steps: [
        ...this.createStepsForMatchClause(query.ast.matchClause),
        ...(query.ast.whereClause ? this.createStepsForWhereClause(query.ast.whereClause) : []),
        ...this.createStepsForReturnClause(query.ast.returnClause),
      ],
      output: {
        fields: this.getOutputFields(query.ast.returnClause),
      },
    };
  }

  createStepsForMatchClause(match: MatchClause): ExecutionPlanStep[] {
    invariant(match.pattern.segments.length > 0);
    const firstSegment = match.pattern.segments[0];
    invariant(firstSegment.astKind === 'NodePattern');
    let lastNodeVariable = (firstSegment.variable?.name as VariableName) ?? this.newVariable();

    const steps: ExecutionPlanStep[] = [];
    steps.push({
      type: 'NodeScan',
      label: firstSegment.label.name,
      into: lastNodeVariable,
    });

    if (firstSegment.properties) {
      for (const property of firstSegment.properties.properties) {
        steps.push({
          type: 'FilterByProperty',
          variable: lastNodeVariable,
          property: property.key.name as JsonPath,
          value: property.value.value,
        });
      }
    }

    for (let i = 1; i < match.pattern.segments.length; i++) {
      const relationshipSegment = match.pattern.segments[i++];
      invariant(relationshipSegment.astKind === 'RelationshipPattern');
      const nodeSegment = match.pattern.segments[i];
      invariant(nodeSegment.astKind === 'NodePattern');
      const leftSeparator = match.pattern.segments.separators[i - 2];
      const rightSeparator = match.pattern.segments.separators[i - 1];
      const direction = getDirection(leftSeparator.direction, rightSeparator.direction);

      const relationshipVariable = (relationshipSegment.variable?.name as VariableName) ?? this.newVariable();
      const nodeVariable = (nodeSegment.variable?.name as VariableName) ?? this.newVariable();

      steps.push({
        type: 'RelationshipScan',
        label: relationshipSegment.label.name,
        direction,
        anchor: lastNodeVariable,
        relationshipInto: relationshipVariable,
        nodeInto: nodeVariable,
      });

      if (relationshipSegment.properties) {
        for (const property of relationshipSegment.properties.properties) {
          steps.push({
            type: 'FilterByProperty',
            variable: relationshipVariable,
            property: property.key.name as JsonPath,
            value: property.value.value,
          });
        }
      }
      if (nodeSegment.label) {
        steps.push({
          type: 'FilterByLabel',
          variable: nodeVariable,
          label: nodeSegment.label.name,
        });
      }
      if (nodeSegment.properties) {
        for (const property of nodeSegment.properties.properties) {
          steps.push({
            type: 'FilterByProperty',
            variable: nodeVariable,
            property: property.key.name as JsonPath,
            value: property.value.value,
          });
        }
      }

      lastNodeVariable = nodeVariable;
    }

    return steps;
  }

  createStepsForWhereClause(where: WhereClause): ExecutionPlanStep[] {
    return [];
  }

  createStepsForReturnClause(returnClause: ReturnClause): ExecutionPlanStep[] {
    return [
      {
        type: 'ProduceResults',
        fields: returnClause.fields.map((field) => ({
          name: field.path.map((p) => p.name).join('_'),
          variable: field.path[0].name as VariableName,
          path:
            field.path.length > 1
              ? (field.path
                  .slice(1)
                  .map((p) => p.name)
                  .join('.') as JsonPath)
              : ('$' as JsonPath),
        })),
      },
    ];
  }

  getOutputFields(returnClause: ReturnClause): string[] {
    return returnClause.fields.map((field) => field.path.map((p) => p.name).join('_'));
  }
}

const getDirection = (
  left: GraphPatternConnector['direction'],
  right: GraphPatternConnector['direction'],
): 'in' | 'out' | 'both' => {
  if (left === '-' && right === '->') {
    return 'out';
  } else if (left === '<-' && right === '-') {
    return 'in';
  } else if (left === '-' && right === '-') {
    return 'both';
  }
  throw new Error(`Invalid direction: ()${left}[]${right}()`);
};
