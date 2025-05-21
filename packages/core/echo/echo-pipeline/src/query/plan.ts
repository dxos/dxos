import type { QueryAST } from '@dxos/echo-protocol';
import type { DXN, ObjectId, SpaceId } from '@dxos/keys';

export declare namespace QueryPlan {
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

  export type Step = SelectStep | FilterStep | TraverseStep | UnionStep;

  /**
   * Select objects based on id, typename, or other predicates.
   * Specifies the spaces to select from.
   */
  export type SelectStep = {
    _tag: 'SelectStep';

    fromSpaces: SpaceId[];

    selector: Selector;
  };

  /**
   * Specifier to scan the database for objects.
   * Optimized to utilize database indexes.
   */
  export type Selector = IdSelector | TypeSelector | TextSearchSelector;

  export type IdSelector = {
    _tag: 'IdSelector';
    objectIds: ObjectId[];
  };

  /**
   * Select objects by typename.
   */
  export type TypeSelector = {
    _tag: 'TypeSelector';
    typename: DXN.String[];
  };

  /**
   * Select objects by preforming a full-text or vector search.
   */
  export type TextSearchSelector = {
    _tag: 'TextSearchSelector';
    text: string;
    searchKind: 'full-text' | 'vector';
  };

  /**
   * Filter objects in the current working set based on a predicate.
   */
  export type FilterStep = {
    _tag: 'FilterStep';
    filter: QueryAST.Filter;
  };

  /**
   * Traverse the object graph, starting from objects in the current working set.
   */
  export type TraverseStep = {
    _tag: 'TraverseStep';
  };

  /**
   * Combine results from multiple plans.
   */
  export type UnionStep = {
    _tag: 'UnionStep';
    plans: Plan[];
  };
}
