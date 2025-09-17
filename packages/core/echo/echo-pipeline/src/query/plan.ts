//
// Copyright 2025 DXOS.org
//

import type { QueryAST } from '@dxos/echo-protocol';
import type { EscapedPropPath } from '@dxos/indexing';
import type { DXN, ObjectId, SpaceId } from '@dxos/keys';

export namespace QueryPlan {
  export type TextSearchKind = 'full-text' | 'vector' | 'hybrid';

  /**
   * A series of linear steps to execute a query.
   * Steps can potentially contain sub-plans in case of unions.
   *
   * The query executor will execute each step in sequence.
   * The plans start with a select step, which adds objects to the current working set.
   * Then the next steps will act on the current working set, preforming filters, traversals, etc.
   */
  export type Plan = {
    steps: Step[];
  };

  export const Plan = Object.freeze({
    make: (steps: Step[]): Plan => ({ steps }),
  });

  export type Step =
    | ClearWorkingSetStep
    | SelectStep
    | FilterStep
    | FilterDeletedStep
    | TraverseStep
    | UnionStep
    | SetDifferenceStep
    | OrderStep;

  /**
   * Clear the current working set.
   */
  export type ClearWorkingSetStep = {
    _tag: 'ClearWorkingSetStep';
  };

  /**
   * Select objects based on id, typename, or other predicates.
   * Specifies the spaces to select from.
   */
  export type SelectStep = {
    _tag: 'SelectStep';

    spaces: readonly SpaceId[];
    selector: Selector;
  };

  /**
   * Specifier to scan the database for objects.
   * Optimized to utilize database indexes.
   */
  export type Selector = WildcardSelector | IdSelector | TypeSelector | TextSelector;

  export type WildcardSelector = {
    _tag: 'WildcardSelector';
  };

  export type IdSelector = {
    _tag: 'IdSelector';

    objectIds: readonly ObjectId[];
  };

  /**
   * Select objects by typename.
   * Supports passing an array of typenames and an optional inverse flag to optimize for index implementation.
   */
  export type TypeSelector = {
    _tag: 'TypeSelector';

    typename: DXN.String[];
    /**
     * If true, select objects that do not match the typename.
     */
    inverted: boolean;
  };

  /**
   * Select objects by preforming a full-text or vector search.
   */
  export type TextSelector = {
    _tag: 'TextSelector';

    text: string;
    searchKind: TextSearchKind;
  };

  /**
   * Filter objects in the current working set based on a predicate.
   */
  export type FilterStep = {
    _tag: 'FilterStep';

    filter: QueryAST.Filter;
  };

  export const FilterStep = Object.freeze({
    isNoop: (step: FilterStep): boolean => {
      switch (step.filter.type) {
        case 'object': {
          // TODO(dmaretskyi): This is error-prone, it could easily break if we add more clauses.
          return (
            step.filter.typename === null &&
            (step.filter.id === undefined || step.filter.id.length === 0) &&
            (step.filter.props === undefined || Object.keys(step.filter.props).length === 0) &&
            (step.filter.foreignKeys === undefined || step.filter.foreignKeys.length === 0)
          );
        }
        default:
          return false;
      }
    },
  });

  /**
   * Filter objects in the current working set based on the deleted state.
   */
  export type FilterDeletedStep = {
    _tag: 'FilterDeletedStep';

    mode: 'only-deleted' | 'only-non-deleted';
  };

  /**
   * Traverse the object graph, starting from objects in the current working set.
   */
  export type TraverseStep = {
    _tag: 'TraverseStep';

    traversal: Traversal;
  };

  /**
   * Describes a traversal of the object graph.
   */
  export type Traversal = ReferenceTraversal | RelationTraversal;

  /**
   * Traverse a reference connection.
   */
  export type ReferenceTraversal = {
    _tag: 'ReferenceTraversal';

    /**
     * Property path where the reference is located.
     */
    property: EscapedPropPath;

    /**
     * outgoing: the reference points from the anchor object to the target.
     * incoming: the reference points to the anchor object from the target.
     */
    direction: 'outgoing' | 'incoming';
  };

  /**
   * Traverse a relation.
   */
  export type RelationTraversal = {
    _tag: 'RelationTraversal';

    /**
     * The direction of the traversal.
     * There are for variants since each relation has two connectors (source & target) and there are two directions to traverse each.
     */
    direction: 'source-to-relation' | 'relation-to-source' | 'target-to-relation' | 'relation-to-target';
  };

  /**
   * Combine results from multiple plans.
   * Each of the plans starts with a copy of the current working set.
   * This supports plans where we first perform a selection, then traverse in different directions, and then combine the results.
   */
  export type UnionStep = {
    _tag: 'UnionStep';

    plans: Plan[];
  };

  /**
   * Subtract the results of one plan from another.
   */
  export type SetDifferenceStep = {
    _tag: 'SetDifferenceStep';

    source: Plan;
    exclude: Plan;
  };

  /**
   * Order the results of the plan.
   */
  export type OrderStep = {
    _tag: 'OrderStep';

    order: readonly QueryAST.Order[];
  };
}
