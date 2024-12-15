import { AST, Schema } from '@effect/schema';
import type { DXN } from '@dxos/keys';
import { Any } from '@effect/schema/Schema';
import { Types } from 'effect';

/*

TODO:

- Move to a separate package
- Turn methods into getters where possible.
- More flexible return types, so that return isn't limited to being an object

- Do we need a separate syntax to express patterns with refs (so that we can utilize the reverse reference index) or are predicates ok?
e.g can we infer the scan order from the query:
> MATCH (d:Document) WHERE d.author.id == $authorId RETURN DISTINCT document.author AS author

Expected plan:
> ScanNodeById(c:Contact, { id: $authorId })
> ReverseReferenceScan(d, d.author == c)
> TypeFilter(d typeof Document)
> Map({ author: document.author })
> Distinct(author)

- Project references as relations.

*/

type Id = string & { __Id: never };

//
// Generic utils
//
type Simplify<T> = { [K in keyof T]: T[K] } & {};

type Flatten<T extends readonly any[]> = T extends [infer Head, ...infer Tail]
  ? Head extends readonly any[]
    ? [...Head, ...Flatten<Tail>]
    : [Head, ...Flatten<Tail>]
  : [];

type Last<T extends any[]> = T extends [...infer _, infer L] ? L : never;

//
// Schema Definition Language
//

// Node

export const NodeTypeId: unique symbol = Symbol.for('@dxos/app-graph/Node');

export type NodeDef<Ident extends string, T> = {
  [NodeTypeId]: {
    _Ident: Ident;
    _T: T;
  };
  identifier: string;
  schema: Schema.Schema<T, any, never>;
};

const nodeDefVariance: NodeDef.Any[typeof NodeTypeId] = { _Ident: '', _T: null };

export const NodeDef = <Ident extends string, S extends Schema.Schema.AnyNoContext>(
  identifier: Ident,
  schema: S,
): NodeDef<Ident, Schema.Schema.Type<S>> => ({
  [NodeTypeId]: nodeDefVariance as any,
  identifier,
  schema,
});

declare namespace NodeDef {
  type Any = NodeDef<string, any>;

  type Properties<T extends NodeDef.Any> = T extends NodeDef<string, infer U> ? U : never;

  type NodeType<N extends NodeDef.Any> = Node<Simplify<NodeDef.Properties<N>>>;
}

// TODO(dmaretskyi): Take node def as parameter?
export type Node<T> = {
  id: Id;
  kind: 'node';
  type: string;

  // TODO(dmaretskyi): Top level?
  data: T;
};

// Relation

export const RelationTypeId: unique symbol = Symbol.for('@dxos/app-graph/Relation');

export type RelationDef<Ident extends string, T> = {
  [RelationTypeId]: {
    _Ident: Ident;
    _T: T;
  };
  identifier: string;
  schema: Schema.Schema<T, any, never>;
};

const relationDefVariance: RelationDef.Any[typeof RelationTypeId] = { _Ident: '', _T: null };

export const RelationDef = <Ident extends string, S extends Schema.Schema.AnyNoContext>(
  identifier: Ident,
  schema: S,
): RelationDef<Ident, Schema.Schema.Type<S>> => ({
  [RelationTypeId]: relationDefVariance as any,
  identifier,
  schema,
});

declare namespace RelationDef {
  type Any = RelationDef<string, any>;

  type Properties<T extends RelationDef.Any> = T extends RelationDef<string, infer U> ? U : never;

  type RelationType<R extends RelationDef.Any> = Node<RelationDef.Properties<R>>;
}

export type Relation<T> = {
  id: Id;
  kind: 'relation';
  type: string;

  // TODO(dmaretskyi): Top level?
  data: T;
};

/**
 * Reference to a node.
 */
interface Ref<N extends NodeDef.Any> {
  dxn: DXN;

  readonly target: Node<NodeDef.Properties<N>> | undefined;

  load(): Promise<Node<NodeDef.Properties<N>>>;
}

declare namespace Ref {
  export type Any = Ref<any>;

  export type TargetNode<R extends Ref.Any> = R extends Ref<infer N> ? N : never;
}

/**
 * Reference that has been resolved.
 */
interface ResolvedRef<N extends NodeDef.Any> extends Ref<N> {
  readonly target: Node<NodeDef.Properties<N>>;
}

interface Ref$<N extends NodeDef.Any> extends Schema.Schema<Ref<N>> {}

const Ref = <N extends NodeDef.Any>(target: N): Ref$<N> => Schema.make(AST.anyKeyword);

//
// Query Language
//

// General

export const RValueTypeId: unique symbol = Symbol.for('@dxos/app-graph/RValue');

/**
 * RValue (from compiler terminology) is an expression that can appear on the right-hand side of an assignment operator.
 */
interface RValue<T> {
  [RValueTypeId]: {
    _T: T;
  };

  eq(other: RValue<T>): RValue<boolean>;
  neq(other: RValue<T>): RValue<boolean>;

  gt(this: RValue<number>, other: RValue<number>): RValue<boolean>;
  gte(this: RValue<number>, other: RValue<number>): RValue<boolean>;
  lt(this: RValue<number>, other: RValue<number>): RValue<boolean>;
  lte(this: RValue<number>, other: RValue<number>): RValue<boolean>;

  and(this: RValue<boolean>, other: RValue<boolean>): RValue<boolean>;
  or(this: RValue<boolean>, other: RValue<boolean>): RValue<boolean>;
}

declare namespace RValue {
  type Any = RValue<any>;

  type Type<T extends RValue.Any> = T extends RValue<infer U> ? U : never;
}

export const LValueTypeId: unique symbol = Symbol.for('@dxos/app-graph/LValue');

/**
 * LValue (from compiler terminology) is an expression that can appear on the left-hand side of an assignment operator.
 */
interface LValue<T> extends RValue<T> {
  [LValueTypeId]: {
    _T: T;
  };

  target(this: LValue<Ref.Any>): T extends Ref.Any ? NodePattern<Ref.TargetNode<T>> : never;
}

declare namespace LValue {
  type Any = LValue<any>;

  type Type<T extends LValue.Any> = T extends LValue<infer U> ? U : never;
}

// TODO(dmaretskyi): Nested paths.
type PathOf<T> = keyof T;

type PickProp<T, P extends PathOf<T>> = T[P];

interface PropSelectable<T> {
  prop<P extends PathOf<T>>(path: P): LValue<PickProp<T, P>>;
}

type ComparisonType<T> = T extends Ref.Any ? Ref.TargetNode<T> | NodePattern<Ref.TargetNode<T>> | Id : T;

type PropertyFilter<T> = Simplify<Partial<{ [K in keyof T]: ComparisonType<T[K]> }>>;

// Match

type PatternInput = NodeDef.Any | (NodeDef.Any | RelationDef.Any)[];

namespace PatternInput {
  export type RightNode<P extends PatternInput> = P extends any[]
    ? Last<P> extends NodeDef.Any
      ? Last<P>
      : unknown
    : P extends NodeDef.Any
      ? P
      : unknown;
}

/**
 * Pattern of 1 node or multiple nodes connected by relations.
 *
 * Cypher: `(a:Node)-[RELATION]->(b:Node)`
 */
interface Pattern<P extends PatternInput> {
  related<R extends RelationDef.Any>(
    relation: RelationPattern<R>,
    opts?: { direction: 'left' | 'right' | 'undirected' },
  ): UnfinishedRelatedPattern<P, R>;

  references<K extends PathOf<NodeDef.Properties<PatternInput.RightNode<P>>>>(
    key: K,
  ): UnfinishedOutgoingReferencePattern<P>;

  // TODO(dmaretskyi): Has to be a single method that takes a key and a node to type the key correctly.
  referencedBy<N extends NodeDef.Any>(
    key: PathOf<NodeDef.Properties<N>>,
    node: NodePattern<N>,
  ): Pattern<ConcatPatterns<P, never, N>>;
}

/**
 * Cypher: `(n:Node)-[RELATION]->_`
 */
interface UnfinishedRelatedPattern<P extends PatternInput, R extends RelationDef.Any> {
  to<N extends NodeDef.Any>(node: NodePattern<N>): Pattern<ConcatPatterns<P, R, N>>;
}

interface UnfinishedOutgoingReferencePattern<P extends PatternInput> {
  a<N extends NodeDef.Any>(node: NodePattern<N>): Pattern<ConcatPatterns<P, never, N>>;
}

export const NodePatternTypeId: unique symbol = Symbol.for('@dxos/app-graph/NodePattern');

/**
 * Pattern of one node exactly.
 * Distinct from "1 or more" node pattern so that you can apply `where` clauses.
 *
 * Cypher: `(n:Node)`
 */
interface NodePattern<N extends NodeDef.Any>
  extends Pattern<N>,
    LValue<Node<NodeDef.Properties<N>>>,
    PropSelectable<NodeDef.Properties<N>> {
  [NodePatternTypeId]: {
    _N: N;
  };

  id(): RValue<Id>;

  where(filter: PropertyFilter<NodeDef.Properties<N>>): NodePattern<N>;
}

declare namespace NodePattern {
  type Data<NP extends NodePattern<any>> = NP extends NodePattern<infer N> ? NodeDef.Properties<N> : unknown;

  type Any = NodePattern<any>;
}

export const RelationPatternTypeId: unique symbol = Symbol.for('@dxos/app-graph/RelationPattern');

/**
 * Cypher: `[r:RELATION]`
 */
interface RelationPattern<R extends RelationDef.Any>
  extends LValue<Relation<RelationDef.Properties<R>>>,
    PropSelectable<RelationDef.Properties<R>> {
  [RelationPatternTypeId]: {
    _R: R;
  };

  id(): RValue<Id>;

  where(filter: PropertyFilter<RelationDef.Properties<R>>): RelationPattern<R>;
}

declare namespace RelationPattern {
  type Data<NP extends RelationPattern<any>> =
    NP extends RelationPattern<infer N> ? RelationDef.Properties<N> : unknown;

  type Any = RelationPattern<any>;
}

interface MatchClause<PS extends PatternInput[]> {
  or<PS1 extends Pattern<any>[]>(...patterns: PS1): MatchClause<PS | MatchClauseOutput<PS1>>;

  where(filter: RValue<boolean>): WhereClause<PS>;

  return(): CompleteQuery<Simplify<ReturnSpecFromPatterns<PS>>>;
  return<R extends AnyReturnSpec>(returnSpec: R): CompleteQuery<Simplify<ReturnSpecType<R>>>;
}

type MatchClauseOutput<P extends Pattern<any>[]> = { [K in keyof P]: P[K] extends Pattern<infer PI> ? PI : never };

type ConcatPatterns<P extends PatternInput, R extends RelationDef.Any, N extends NodeDef.Any> = P extends NodeDef.Any
  ? [P, R, N]
  : P extends [...infer Elements]
    ? [...Elements, R, N]
    : never;

// Where

interface WhereClause<PS extends PatternInput[]> {
  where(filter: RValue<boolean>): WhereClause<PS>;

  return(): CompleteQuery<Simplify<ReturnSpecFromPatterns<PS>>>;
  return<R extends AnyReturnSpec>(returnSpec: R): CompleteQuery<Simplify<ReturnSpecType<R>>>;
}

// Return

type ReturnSpecFromPattern<P extends PatternInput> = P extends NodeDef.Any
  ? Node<NodeDef.Properties<P>>
  : P extends any[]
    ? {
        [K in keyof P]: P[K] extends NodeDef.Any
          ? NodeDef.NodeType<P[K]>
          : P[K] extends RelationDef.Any
            ? RelationDef.RelationType<P[K]>
            : unknown;
      }
    : unknown;

export type ReturnSpecFromPatterns<PS extends PatternInput[]> = PS extends any[]
  ? {
      [K in keyof PS]: ReturnSpecFromPattern<PS[K]>;
    }
  : unknown;

type AnyReturnSpec = Record<string, LValue<any>>;

type ReturnSpecType<R extends AnyReturnSpec> = {
  [K in keyof R]: R[K] extends LValue<infer T> ? T : unknown;
};

// Query builder

type AnyQueryResult = Record<string, any>;

type OrderDirection = 'ASC' | 'DESC';

interface CompleteQuery<R extends AnyQueryResult> {
  distinct(): CompleteQuery<R>;

  orderBy(...props: [RValue<any>, OrderDirection][]): CompleteQuery<R>;

  limit(rows: number): CompleteQuery<R>;
  // TODO(dmaretskyi): Research different paging methods.
  skip(rows: number): CompleteQuery<R>;
}

declare namespace CompleteQuery {
  export type Any = CompleteQuery<any>;

  export type Result<Q extends CompleteQuery<any>> = Q extends CompleteQuery<infer R> ? R : unknown;
}

interface QueryBuilder {
  //
  // Patterns
  //
  Node<N extends NodeDef.Any>(def: N): NodePattern<N>;
  Relation<R extends RelationDef.Any>(def: R): RelationPattern<R>;

  //
  // Expressions
  //

  literal<T>(value: T): RValue<T>;

  not(value: RValue<boolean>): RValue<boolean>;
  and(...values: RValue<boolean>[]): RValue<boolean>;
  or(...values: RValue<boolean>[]): RValue<boolean>;

  //
  // Clauses
  //

  /**
   * All patterns must match at the same time.
   */
  Match<PS extends Pattern<any>[]>(...patterns: PS): MatchClause<MatchClauseOutput<PS>>;

  /**
   * Helper to define scoped parameters.
   */
  build<Q extends CompleteQuery<any>>(builderFn: () => Q): Q;
}

//
// Example schema
//

const ContactSchema = Schema.Struct({
  name: Schema.String,
});

const ContactNode = NodeDef('Contact', ContactSchema);

const DocumentSchema = Schema.Struct({
  name: Schema.String,
  kind: Schema.Literal('text', 'diagram'),
  content: Schema.String,
  author: Ref(ContactNode),
}).pipe(Schema.mutable);

const DocumentNode = NodeDef('Document', DocumentSchema);

const ActionSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  // TODO(dmaretskyi): Parameters.
});

const ActionNode = NodeDef('Action', ActionSchema);

const ActionForNodeSchema = Schema.Struct({
  kind: Schema.Any,
});

const ActionForNodeRelation = RelationDef('ActionForNode', ActionForNodeSchema);

// TODO(dmaretskyi): Example for testing, actual impl will have subscriptions.
const runQuery = <Q extends CompleteQuery.Any>(query: Q): Simplify<CompleteQuery.Result<Q>> => {
  return null as any;
};

//
// Example queries
//

// QB.cypher<Document>`MATCH (d:Document { kind: 'text' }) RETURN d`;

declare const QB: QueryBuilder;

// MATCH (d:Document { kind: 'text' }) RETURN d
const getAllTextDocuments = QB.Match(QB.Node(DocumentNode).where({ kind: 'text' })).return();

// MATCH (Document)-[ACTION_FOR_NODE]->(Action)
const getAllActionsForAllDocuments = QB.Match(
  QB.Node(DocumentNode).related(QB.Relation(ActionForNodeRelation)).to(QB.Node(ActionNode)),
).return();

// MATCH (d:Document) RETURN d.name AS name, d.kind AS kind
const getAllDocumentsMetadata = QB.build(() => {
  const document = QB.Node(DocumentNode);

  return QB.Match(document).return({
    name: document.prop('name'),
    kind: document.prop('kind'),
  });
});

// MATCH (d:Document)-[ACTION_FOR_NODE]->(a:Action) RETURN d.name AS name, d.content AS content, d.author.name AS authorName, a AS action ORDER BY authorName DESC, name ASC LIMIT 100
const getAllDocumentNamesAndTheirAuthorsAndTheirActions = QB.build(() => {
  const document = QB.Node(DocumentNode);
  const action = QB.Node(ActionNode);

  const authorName = document.prop('author').target().prop('name');

  return QB.Match(document.related(QB.Relation(ActionForNodeRelation)).to(action))
    .return({
      name: document.prop('name'),
      content: document.prop('content'),
      authorName,
      action: action,
    })
    .orderBy([authorName, 'DESC'], [document.prop('name'), 'ASC'])
    .limit(100);
});

// MATCH (d:Document) RETURN DISTINCT document.author AS author
const allContactsThatHaveAuthoredDocuments = QB.build(() => {
  const document = QB.Node(DocumentNode);

  return QB.Match(document)
    .return({
      author: document.prop('author').target(),
    })
    .distinct();
});

// MATCH (d:Document) WHERE d.author.id == $authorId RETURN DISTINCT document.author AS author
const allDocumentsByThisAuthorWhere = (authorId: Id) =>
  QB.build(() => {
    const document = QB.Node(DocumentNode);
    const author = document.prop('author').target();

    return QB.Match(document)
      .where(author.id().eq(QB.literal(authorId)))
      .return({
        author,
      })
      .distinct();
  });

// Note: this is a variation of the above query with WHERE clause, but this one might be easier for the Query Planner to optimize to use the Reverse Reference Index since the author constraint is in the pattern.
// MATCH (d:Document { author: $authorId }) RETURN DISTINCT document.name AS name
const allDocumentsByThisAuthorPattern = (authorId: Id) =>
  QB.build(() => {
    const document = QB.Node(DocumentNode).where({ author: authorId });

    return QB.Match(document)
      .return({
        name: document.prop('name'),
        author: document.prop('author').target(),
      })
      .distinct();
  });

// Get all documents authored by Rick

// MATCH (d:Document) WHERE d.author.name == 'Rick' RETURN document.name AS name
const allDocumentsByRicks = QB.build(() => {
  const document = QB.Node(DocumentNode);

  return QB.Match(document)
    .where(document.prop('author').target().prop('name').eq(QB.literal('Rick')))
    .return({
      name: document.prop('name'),
    });
});

// MATCH (d:Document { author: (Node { name: 'Rick' }) }) RETURN document.name AS name
const allDocumentByRicks2 = QB.build(() => {
  const contact = QB.Node(ContactNode).where({ name: 'Rick' });
  const document = QB.Node(DocumentNode).where({ author: contact });

  return QB.Match(document).return({
    name: document.prop('name'),
  });
});

// MATCH (d:Document)-[.author]->(c:Contact) WHERE c.name == 'Rick' RETURN document.name AS name
const allDocumentByRicks3 = QB.build(() => {
  const document = QB.Node(DocumentNode);
  const contact = QB.Node(ContactNode).where({ name: 'Rick' });

  return QB.Match(document.references('author').a(contact)).return({
    name: document.prop('name'),
  });
});

// MATCH (c:Contact)<-[.author]-(d:Document) WHERE c.name == 'Rick' RETURN document.name AS name
const allDocumentByRicks4 = QB.build(() => {
  const document = QB.Node(DocumentNode);
  const contact = QB.Node(ContactNode).where({ name: 'Rick' });

  return QB.Match(contact.referencedBy('author', document)).return({
    name: document.prop('name'),
  });
});
