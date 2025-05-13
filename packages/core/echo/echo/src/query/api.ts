import { Schema } from 'effect';
import { Type } from '..';
import { EchoRelation, getSchemaDXN, type Ref } from '@dxos/echo-schema';
import { raise } from '@dxos/debug';

const Relation = {
  def: EchoRelation,
};

// TODO(dmaretskyi): Split up into interfaces for objects and relations so they can have separate verbs.
// TODO(dmaretskyi): Undirected relation traversals.
interface Query<T> {
  '~Query': { value: T };

  ast: QueryAST.AST;

  /**
   * Traverse an outgoing reference.
   * @param key - Property path inside T that is a reference.
   * @returns Query for the target of the reference.
   */
  references<K extends RefPropKey<T>>(key: K): Query<Ref.Target<T[K]>>;

  /**
   * Find objects referencing this object.
   * @param target - Schema of the referencing object.
   * @param key - Property path inside the referencing object that is a reference.
   * @returns Query for the referencing objects.
   */
  // TODO(dmaretskyi): any way to enforce `Ref.Target<Schema.Schema.Type<S>[key]> == T`?
  referencedBy<S extends Schema.Schema.All>(
    target: S,
    key: RefPropKey<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Relations outgoing from the object.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  outgoingRelations<S extends Schema.Schema.All>(
    relation: S,
    predicates?: PredicateSet<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * Relations incoming to the object.
   * @returns Query for the relation objects.
   * @param relation - Schema of the relation.
   * @param predicates - Predicates to filter the relation objects.
   */
  incomingRelations<S extends Schema.Schema.All>(
    relation: S,
    predicates?: PredicateSet<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  /**
   * For a query for relations, get the source objects.
   * @returns Query for the source objects.
   */
  sources<S extends Schema.Schema.All>(): Query<Schema.Schema.Type<S>>;

  /**
   * For a query for relations, get the target objects.
   * @returns Query for the target objects.
   */
  targets<S extends Schema.Schema.All>(): Query<Schema.Schema.Type<S>>;
}

interface QueryAPI {
  type<S extends Schema.Schema.All>(
    schema: S,
    predicates?: PredicateSet<Schema.Schema.Type<S>>,
  ): Query<Schema.Schema.Type<S>>;

  all<T>(...queries: Query<T>[]): Query<T>;

  gt<T>(value: T): Predicate<T>;
  gte<T>(value: T): Predicate<T>;
  lt<T>(value: T): Predicate<T>;
  lte<T>(value: T): Predicate<T>;
  in<T>(...values: T[]): Predicate<T>;
  range<T>(from: T, to: T): Predicate<T>;
}

interface Predicate<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Predicate': { value: T };

  ast: QueryAST.Predicate;
}

const Predicate = {
  variance: {} as Predicate<any>['~Predicate'],

  make<T>(ast: QueryAST.Predicate): Predicate<T> {
    return { ast, '~Predicate': Predicate.variance } as Predicate<T>;
  },
};

type PredicateSet<T> = {
  // Predicate or a value as a shorthand for `eq`.
  [K in keyof T & string]?: Predicate<T[K]> | T[K];
};

/**
 * All property paths inside T that are references.
 */
type RefPropKey<T> = { [K in keyof T]: T[K] extends Ref<infer U> ? K : never }[keyof T] & string;

const predicateSetToAst = (predicates: PredicateSet<any>): QueryAST.PredicateSet => {
  return Object.fromEntries(
    Object.entries(predicates).map(([key, predicate]) => [key, predicate.ast]),
  ) as QueryAST.PredicateSet;
};

class QueryClass implements Query<any> {
  private static variance: Query<any>['~Query'] = {} as Query<any>['~Query'];

  static type(schema: Schema.Schema.All, predicates?: PredicateSet<any>): Query<any> {
    const dxn = getSchemaDXN(schema) ?? raise(new TypeError('Schema has no DXN'));
    return new QueryClass({
      type: 'type',
      typename: dxn.toString(),
      predicates,
    });
  }

  static all(...queries: Query<any>[]): Query<any> {
    return new QueryClass({
      type: 'union',
      queries: queries.map((q) => q.ast),
    });
  }

  static gt(value: unknown): Predicate<any> {
    return Predicate.make({ type: 'gt', value });
  }

  static gte(value: unknown): Predicate<any> {
    return Predicate.make({ type: 'gte', value });
  }

  static lt(value: unknown): Predicate<any> {
    return Predicate.make({ type: 'lt', value });
  }

  static lte(value: unknown): Predicate<any> {
    return Predicate.make({ type: 'lte', value });
  }

  static in(...values: unknown[]): Predicate<any> {
    return Predicate.make({ type: 'in', values });
  }

  static range(from: unknown, to: unknown): Predicate<any> {
    return Predicate.make({ type: 'range', from, to });
  }

  constructor(public readonly ast: QueryAST.AST) {}

  '~Query' = QueryClass.variance;

  references(key: string): Query<any> {
    return new QueryClass({
      type: 'reference-traversal',
      anchor: this.ast,
      property: key,
    });
  }

  referencedBy(target: Schema.Schema.All, key: string): Query<any> {
    const dxn = getSchemaDXN(target) ?? raise(new TypeError('Target schema has no DXN'));
    return new QueryClass({
      type: 'incoming-references',
      anchor: this.ast,
      property: key,
      typename: dxn.toString(),
    });
  }

  outgoingRelations(relation: Schema.Schema.All, predicates?: PredicateSet<any> | undefined): Query<any> {
    const dxn = getSchemaDXN(relation) ?? raise(new TypeError('Relation schema has no DXN'));
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      typename: dxn.toString(),
      predicates,
    });
  }

  incomingRelations(relation: Schema.Schema.All, predicates?: PredicateSet<any> | undefined): Query<any> {
    const dxn = getSchemaDXN(relation) ?? raise(new TypeError('Relation schema has no DXN'));
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      typename: dxn.toString(),
      predicates,
    });
  }

  sources(): Query<any> {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'source',
    });
  }

  targets(): Query<any> {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'target',
    });
  }
}

const Query: QueryAPI = QueryClass;

//
// Query AST
//

export namespace QueryAST {
  export type Predicate =
    | {
        type: 'eq';
        value: unknown;
      }
    | {
        type: 'neq';
        value: unknown;
      }
    | {
        type: 'gt';
        value: unknown;
      }
    | {
        type: 'gte';
        value: unknown;
      }
    | {
        type: 'lt';
        value: unknown;
      }
    | {
        type: 'lte';
        value: unknown;
      }
    | {
        type: 'in';
        values: unknown[];
      }
    | {
        type: 'range';
        from: unknown;
        to: unknown;
      };

  export type PredicateSet = { [prop: string]: Predicate };

  export type AST =
    // Query objects by type, id, and/or predicates.
    | {
        type: 'type';
        typename?: string;
        id?: string;
        predicates?: PredicateSet;
      }
    // Traverse references from an anchor object.
    | {
        type: 'reference-traversal';
        anchor: AST;
        property: string;
      }
    // Traverse incoming references to an anchor object.
    | {
        type: 'incoming-references';
        anchor: AST;
        property: string;
        typename: string;
      }
    // Traverse relations connecting to an anchor object.
    | {
        type: 'relation';
        anchor: AST;
        direction: 'outgoing' | 'incoming' | 'both';
        typename: string;
        predicates?: PredicateSet;
      }
    // Traverse into the source or target of a relation.
    | {
        type: 'relation-traversal';
        anchor: AST;
        direction: 'source' | 'target' | 'both';
      }
    // Union of multiple queries.
    | {
        type: 'union';
        queries: AST[];
      };
}

//
// Example schema
//

const Person = Schema.Struct({
  name: Schema.String,
}).pipe(Type.def({ typename: 'dxos.org/type/Person', version: '0.1.0' }));
interface Person extends Schema.Schema.Type<typeof Person> {}

const Org = Schema.Struct({
  name: Schema.String,
}).pipe(Type.def({ typename: 'dxos.org/type/Org', version: '0.1.0' }));
interface Org extends Schema.Schema.Type<typeof Org> {}

const WorksFor = Schema.Struct({
  since: Schema.String,
}).pipe(Relation.def({ typename: 'dxos.org/type/WorksFor', version: '0.1.0', source: Person, target: Org }));
interface WorksFor extends Schema.Schema.Type<typeof WorksFor> {}

const Task = Schema.Struct({
  title: Schema.String,
  createdAt: Schema.String,
  assignee: Type.Ref(Person),
}).pipe(Type.def({ typename: 'dxos.org/type/Task', version: '0.1.0' }));
interface Task extends Schema.Schema.Type<typeof Task> {}

//
// Example queries
//

// Query<Person>
const getAllPeople = Query.type(Person);

// Query<Person>
const getAllPeopleNamedFred = Query.type(Person, { name: 'Fred' });

// Query<Org>
declare const fred: any;
const getAllOrgsFredWorkedForSince2020 = Query.type(Person, { id: fred.id })
  .outgoingRelations(WorksFor, { since: Query.gt('2020') })
  .targets();

// Query<Task>
const getAllTasksForFred = Query.type(Person, { id: fred.id }).referencedBy(Task, 'assignee');

// Query<Task>
const allTasksForEmployeesOfCyberdyne = Query.type(Org, { name: 'Cyberdyne' })
  .incomingRelations(WorksFor)
  .sources()
  .referencedBy(Task, 'assignee');

// Query<Person | Org>
const allPeopleOrOrgs = Query.all(Query.type(Person), Query.type(Org));

// Query<Person>
const assigneesOfAllTasksCreatedAfter2020 = Query.type(Task, { createdAt: Query.gt('2020') }).references('assignee');
