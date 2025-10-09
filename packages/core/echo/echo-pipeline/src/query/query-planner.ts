//
// Copyright 2025 DXOS.org
//

import { Order } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import type { DXN, SpaceId } from '@dxos/keys';

import { QueryError } from './errors';
import { QueryPlan } from './plan';

export type QueryPlannerOptions = {
  defaultTextSearchKind: QueryPlan.TextSearchKind;
};

const DEFAULT_OPTIONS: QueryPlannerOptions = {
  defaultTextSearchKind: 'full-text',
};

/**
 * Constructs an optimized query plan.
 */
// TODO(dmaretskyi): Implement inefficient versions of complex queries.
export class QueryPlanner {
  private readonly _options: QueryPlannerOptions;

  constructor(options?: Partial<QueryPlannerOptions>) {
    this._options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  createPlan(query: QueryAST.Query): QueryPlan.Plan {
    let plan = this._generate(query, { ...DEFAULT_CONTEXT, originalQuery: query });
    plan = this._optimizeEmptyFilters(plan);
    plan = this._optimizeSoloUnions(plan);
    plan = this._ensureOrderStep(plan);
    return plan;
  }

  private _generate(query: QueryAST.Query, context: GenerationContext): QueryPlan.Plan {
    switch (query.type) {
      case 'options':
        return this._generateOptionsClause(query, context);
      case 'select':
        return this._generateSelectClause(query, context);
      case 'filter':
        return this._generateFilterClause(query, context);
      case 'incoming-references':
        return this._generateIncomingReferencesClause(query, context);
      case 'relation':
        return this._generateRelationClause(query, context);
      case 'relation-traversal':
        return this._generateRelationTraversalClause(query, context);
      case 'reference-traversal':
        return this._generateReferenceTraversalClause(query, context);
      case 'union':
        return this._generateUnionClause(query, context);
      case 'set-difference':
        return this._generateSetDifferenceClause(query, context);
      case 'order':
        return this._generateOrderClause(query, context);
      default:
        throw new QueryError({
          message: `Unsupported query type: ${(query as any).type}`,
          context: { query: context.originalQuery },
        });
    }
  }

  private _generateOptionsClause(query: QueryAST.QueryOptionsClause, context: GenerationContext): QueryPlan.Plan {
    const newContext = {
      ...context,
    };
    if (query.options.spaceIds) {
      newContext.selectionSpaces = query.options.spaceIds as readonly SpaceId[];
    }
    if (query.options.deleted) {
      newContext.deletedHandling = query.options.deleted;
    }
    return this._generate(query.query, newContext);
  }

  private _generateSelectClause(query: QueryAST.QuerySelectClause, context: GenerationContext): QueryPlan.Plan {
    return this._generateSelectionFromFilter(query.filter, context);
  }

  // TODO(dmaretskyi): This can be rewritten as a function of (filter[]) -> (selection ? undefined, rest: filter[]) that recurses onto itself.
  // TODO(dmaretskyi): If the tip of the query ast is a [select, ...filter] shape we can reorder the filters so the query is most efficient.
  private _generateSelectionFromFilter(filter: QueryAST.Filter, context: GenerationContext): QueryPlan.Plan {
    switch (filter.type) {
      // Props
      case 'object': {
        if (
          context.selectionInverted &&
          filter.id === undefined &&
          filter.typename === null &&
          Object.keys(filter.props).length === 0
        ) {
          // filter of nothing -> clear working set.
          return QueryPlan.Plan.make([
            {
              _tag: 'ClearWorkingSetStep',
            },
            ...this._generateDeletedHandlingSteps(context),
          ]);
        }
        if (context.selectionInverted) {
          throw new QueryError({
            message: 'Query too complex',
            context: { query: context.originalQuery },
          });
        }

        // Try to utilize indexes during selection, prioritizing selecting by id, then by typename.
        // After selection, filter out using the remaining predicates.
        if (filter.id && filter.id?.length > 0) {
          return QueryPlan.Plan.make([
            {
              _tag: 'SelectStep',
              spaces: context.selectionSpaces,
              selector: {
                _tag: 'IdSelector',
                objectIds: filter.id,
              },
            },
            ...this._generateDeletedHandlingSteps(context),
            {
              _tag: 'FilterStep',
              filter: { ...filter, id: undefined },
            },
          ]);
        } else if (filter.typename) {
          return QueryPlan.Plan.make([
            {
              _tag: 'SelectStep',
              spaces: context.selectionSpaces,
              selector: {
                _tag: 'TypeSelector',
                typename: [filter.typename as DXN.String],
                inverted: false,
              },
            },
            ...this._generateDeletedHandlingSteps(context),
            {
              _tag: 'FilterStep',
              filter: { ...filter, typename: null },
            },
          ]);
        } else {
          return QueryPlan.Plan.make([
            {
              _tag: 'SelectStep',
              spaces: context.selectionSpaces,
              selector: {
                _tag: 'WildcardSelector',
              },
            },
            ...this._generateDeletedHandlingSteps(context),
            {
              _tag: 'FilterStep',
              filter: { ...filter },
            },
          ]);
        }
      }

      // Tag
      case 'tag': {
        return QueryPlan.Plan.make([
          {
            _tag: 'SelectStep',
            spaces: context.selectionSpaces,
            selector: {
              _tag: 'WildcardSelector',
            },
          },
          ...this._generateDeletedHandlingSteps(context),
          {
            _tag: 'FilterStep',
            filter: { ...filter },
          },
        ]);
      }

      // Text
      case 'text-search': {
        return QueryPlan.Plan.make([
          {
            _tag: 'SelectStep',
            spaces: context.selectionSpaces,
            selector: {
              _tag: 'TextSelector',
              text: filter.text,
              searchKind: filter.searchKind ?? this._options.defaultTextSearchKind,
            },
          },
          ...this._generateDeletedHandlingSteps(context),
        ]);
      }

      // Compare
      case 'compare':
        throw new QueryError({ message: 'Query too complex', context: { query: context.originalQuery } });
      case 'in':
        throw new QueryError({ message: 'Query too complex', context: { query: context.originalQuery } });
      case 'range':
        throw new QueryError({ message: 'Query too complex', context: { query: context.originalQuery } });

      // Boolean
      case 'not':
        return this._generateSelectionFromFilter(filter.filter, {
          ...context,
          selectionInverted: !context.selectionInverted,
        });
      case 'and':
        throw new QueryError({ message: 'Query too complex', context: { query: context.originalQuery } });
      case 'or':
        // Optimized case
        if (filter.filters.every(isTrivialTypenameFilter)) {
          const typenames = filter.filters.map((filter) => {
            invariant(filter.type === 'object' && filter.typename !== null);
            return filter.typename;
          });

          return QueryPlan.Plan.make([
            {
              _tag: 'SelectStep',
              spaces: context.selectionSpaces,
              selector: {
                _tag: 'TypeSelector',
                typename: typenames as DXN.String[],
                inverted: context.selectionInverted,
              },
            },
            ...this._generateDeletedHandlingSteps(context),
          ]);
        } else {
          throw new QueryError({ message: 'Query too complex', context: { query: context.originalQuery } });
        }

      default:
        throw new QueryError({
          message: `Unsupported filter type: ${(filter as any).type}`,
          context: { query: context.originalQuery },
        });
    }
  }

  private _generateDeletedHandlingSteps(context: GenerationContext): QueryPlan.Step[] {
    switch (context.deletedHandling) {
      case 'include':
        return [];
      case 'exclude':
        return [
          {
            _tag: 'FilterDeletedStep',
            mode: 'only-non-deleted',
          },
        ];
      case 'only':
        return [
          {
            _tag: 'FilterDeletedStep',
            mode: 'only-deleted',
          },
        ];
    }
  }

  private _generateUnionClause(query: QueryAST.QueryUnionClause, context: GenerationContext): QueryPlan.Plan {
    return QueryPlan.Plan.make([
      {
        _tag: 'UnionStep',
        plans: query.queries.map((query) => this._generate(query, context)),
      },
    ]);
  }

  private _generateSetDifferenceClause(
    query: QueryAST.QuerySetDifferenceClause,
    context: GenerationContext,
  ): QueryPlan.Plan {
    return QueryPlan.Plan.make([
      {
        _tag: 'SetDifferenceStep',
        source: this._generate(query.source, context),
        exclude: this._generate(query.exclude, context),
      },
    ]);
  }

  private _generateReferenceTraversalClause(
    query: QueryAST.QueryReferenceTraversalClause,
    context: GenerationContext,
  ): QueryPlan.Plan {
    return QueryPlan.Plan.make([
      ...this._generate(query.anchor, context).steps,
      {
        _tag: 'TraverseStep',
        traversal: {
          _tag: 'ReferenceTraversal',
          direction: 'outgoing',
          property: query.property,
        },
      },
      ...this._generateDeletedHandlingSteps(context),
    ]);
  }

  private _generateIncomingReferencesClause(
    query: QueryAST.QueryIncomingReferencesClause,
    context: GenerationContext,
  ): QueryPlan.Plan {
    return QueryPlan.Plan.make([
      ...this._generate(query.anchor, context).steps,
      {
        _tag: 'TraverseStep',
        traversal: {
          _tag: 'ReferenceTraversal',
          direction: 'incoming',
          property: query.property,
        },
      },
      ...this._generateDeletedHandlingSteps(context),
      {
        _tag: 'FilterStep',
        filter: {
          type: 'object',
          typename: query.typename,
          props: {},
        },
      },
    ]);
  }

  private _generateRelationTraversalClause(
    query: QueryAST.QueryRelationTraversalClause,
    context: GenerationContext,
  ): QueryPlan.Plan {
    switch (query.direction) {
      case 'source': {
        return QueryPlan.Plan.make([
          ...this._generate(query.anchor, context).steps,
          createRelationTraversalStep('relation-to-source'),
          ...this._generateDeletedHandlingSteps(context),
        ]);
      }
      case 'target': {
        return QueryPlan.Plan.make([
          ...this._generate(query.anchor, context).steps,
          createRelationTraversalStep('relation-to-target'),
          ...this._generateDeletedHandlingSteps(context),
        ]);
      }
      case 'both': {
        const anchorPlan = this._generate(query.anchor, context);
        return QueryPlan.Plan.make([
          ...anchorPlan.steps,
          {
            _tag: 'UnionStep',
            plans: [
              QueryPlan.Plan.make([createRelationTraversalStep('relation-to-source')]),
              QueryPlan.Plan.make([createRelationTraversalStep('relation-to-target')]),
            ],
          },
          ...this._generateDeletedHandlingSteps(context),
        ]);
      }
    }
  }

  private _generateRelationClause(query: QueryAST.QueryRelationClause, context: GenerationContext): QueryPlan.Plan {
    switch (query.direction) {
      case 'outgoing': {
        return QueryPlan.Plan.make([
          ...this._generate(query.anchor, context).steps,
          createRelationTraversalStep('source-to-relation'),
          ...this._generateDeletedHandlingSteps(context),
          {
            _tag: 'FilterStep',
            filter: query.filter ?? NOOP_FILTER,
          },
        ]);
      }
      case 'incoming': {
        return QueryPlan.Plan.make([
          ...this._generate(query.anchor, context).steps,
          createRelationTraversalStep('target-to-relation'),
          ...this._generateDeletedHandlingSteps(context),
          {
            _tag: 'FilterStep',
            filter: query.filter ?? NOOP_FILTER,
          },
        ]);
      }
      case 'both': {
        const anchorPlan = this._generate(query.anchor, context);
        return QueryPlan.Plan.make([
          ...anchorPlan.steps,
          {
            _tag: 'UnionStep',
            plans: [
              QueryPlan.Plan.make([createRelationTraversalStep('source-to-relation')]),
              QueryPlan.Plan.make([createRelationTraversalStep('target-to-relation')]),
            ],
          },
          ...this._generateDeletedHandlingSteps(context),
          {
            _tag: 'FilterStep',
            filter: query.filter ?? NOOP_FILTER,
          },
        ]);
      }
    }
  }

  private _generateFilterClause(query: QueryAST.QueryFilterClause, context: GenerationContext): QueryPlan.Plan {
    return QueryPlan.Plan.make([
      ...this._generate(query.selection, context).steps,
      {
        _tag: 'FilterStep',
        filter: query.filter,
      },
    ]);
  }

  /**
   * Removes filter steps that have no predicates.
   */
  private _optimizeEmptyFilters(plan: QueryPlan.Plan): QueryPlan.Plan {
    return QueryPlan.Plan.make(
      plan.steps
        .filter((step) => {
          if (step._tag === 'FilterStep') {
            return !QueryPlan.FilterStep.isNoop(step);
          } else {
            return true;
          }
        })
        .map((step) => {
          if (step._tag === 'UnionStep') {
            return {
              _tag: 'UnionStep',
              plans: step.plans.map((plan) => this._optimizeEmptyFilters(plan)),
            };
          } else {
            return step;
          }
        }),
    );
  }

  /**
   * Removes union steps that have only one child.
   */
  private _optimizeSoloUnions(plan: QueryPlan.Plan): QueryPlan.Plan {
    // TODO(dmaretskyi): Implement this.
    return plan;
  }

  private _generateOrderClause(query: QueryAST.QueryOrderClause, context: GenerationContext): QueryPlan.Plan {
    return QueryPlan.Plan.make([
      ...this._generate(query.query, context).steps,
      {
        _tag: 'OrderStep',
        order: query.order,
      },
    ]);
  }

  // After complete plan is built, inspect it from the end:
  //   - Walk backwards until hitting an object set changer.
  //   - If an order step is found, skip.
  //   - Otherwise append natural order to the end.
  private _ensureOrderStep(plan: QueryPlan.Plan): QueryPlan.Plan {
    const OBJECT_SET_CHANGERS = new Set(['SelectStep', 'TraverseStep', 'UnionStep', 'SetDifferenceStep']);
    for (let i = plan.steps.length - 1; i >= 0; i--) {
      const step = plan.steps[i];
      if (step._tag === 'OrderStep') {
        return plan;
      }
      if (OBJECT_SET_CHANGERS.has(step._tag)) {
        break;
      }
    }

    return QueryPlan.Plan.make([
      ...plan.steps,
      {
        _tag: 'OrderStep',
        order: [Order.natural.ast],
      },
    ]);
  }
}

/**
 * Context for query planning.
 */
type GenerationContext = {
  /**
   * The original query.
   */
  originalQuery: QueryAST.Query | null;

  /**
   * Which spaces to select from.
   */
  selectionSpaces: readonly SpaceId[];

  /**
   * How to handle deleted objects.
   */
  deletedHandling: 'include' | 'exclude' | 'only';

  /**
   * When generating a selection clause, whether to invert the filter.
   */
  selectionInverted: boolean;
};

const DEFAULT_CONTEXT: GenerationContext = {
  originalQuery: null,
  selectionSpaces: [],
  deletedHandling: 'exclude',
  selectionInverted: false,
};

const NOOP_FILTER: QueryAST.Filter = {
  type: 'object',
  typename: null,
  id: [],
  props: {},
};

const createRelationTraversalStep = (direction: QueryPlan.RelationTraversal['direction']): QueryPlan.Step => ({
  _tag: 'TraverseStep',
  traversal: {
    _tag: 'RelationTraversal',
    direction,
  },
});

const isTrivialTypenameFilter = (filter: QueryAST.Filter): boolean => {
  return (
    filter.type === 'object' &&
    filter.typename !== null &&
    Object.keys(filter.props).length === 0 &&
    (filter.id === undefined || filter.id.length === 0) &&
    (filter.foreignKeys === undefined || filter.foreignKeys.length === 0)
  );
};
