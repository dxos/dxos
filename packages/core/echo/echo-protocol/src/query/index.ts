//
// Copyright 2025 DXOS.org
//

export * as QueryAST from './ast';

// The query union (`QueryAST.Query`) is a discriminated union of clause interfaces. When the union
// flows through generic inference downstream (e.g. `Ref.Ref(Trigger)` intersecting the trigger's
// structural type), TypeScript expands it and must name each member. A `export * as` namespace
// re-export is not a portable name source for declaration emit (TS2883), so the clause interfaces
// are also re-exported by name here to give consumers a portable path.
export type {
  QuerySelectClause,
  QueryFilterClause,
  QueryReferenceTraversalClause,
  QueryIncomingReferencesClause,
  QueryRelationClause,
  QueryRelationTraversalClause,
  QueryHierarchyTraversalClause,
  QueryUnionClause,
  QuerySetDifferenceClause,
  QueryOrderClause,
  QueryOptionsClause,
  QueryLimitClause,
  QueryFromClause,
} from './ast';
