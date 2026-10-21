//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Result from 'effect/Result';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import * as Skill from '@dxos/compute/Skill';
import { Annotation, Database, Entity as EchoEntity, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';

/** Characters of a string inside a printed value shown before it is cut. */
const MAX_STRING = 200;

/** Items of an array inside a printed value shown before the rest are counted instead. */
const MAX_ITEMS = 10;

/** How deep a printed value is followed before nested structure is summarized. */
const MAX_DEPTH = 4;

/** Objects of a printed array rendered as full cards before the rest are summarized one per line. */
const MAX_CARDS = 20;

/** Neighbours the exploration query reads; past this the counts are reported as lower bounds. */
const MAX_EXPLORED = 25;

/** Objects one evaluation explores; a loop printing more gets plain cards for the rest. */
const MAX_EXPLORED_OBJECTS = 5;

/** Groups listed per kind of exploration hint (relation types, child types, referrer fields). */
const MAX_GROUPS = 6;

/**
 * How a dialect spells the code that fetches what a hint counts. Each returns one expression or
 * statement the model can paste; the printer only knows the counts, never the dialect's syntax.
 */
export type HintSyntax = {
  /** Relations of one type whose source (`out`) or target (`in`) is the object. */
  readonly relations: (id: string, relation: string, direction: 'out' | 'in') => string;
  /** Objects whose parent is the object. */
  readonly children: (id: string) => string;
  /** Objects of one type whose `field` holds a reference to the object. */
  readonly referrers: (id: string, type: string, field: string | undefined) => string;
};

/** What the printer can see about the conversation, beyond the object itself. */
export type DescribeContext = {
  readonly syntax: HintSyntax;
  /** Keys of the skills the conversation has bound, to mark which of a type's skills are missing. */
  readonly skills?: readonly string[];
};

/** Counts of one kind of neighbour, grouped by the type (and field) the hint's code names. */
type Group = { readonly type: string; readonly field?: string; readonly count: number };

/** What {@link explore} found around one object: counts only, never the neighbours themselves. */
export type Neighbourhood = {
  readonly outgoing: readonly Group[];
  readonly incoming: readonly Group[];
  readonly children: readonly Group[];
  readonly referrers: readonly Group[];
  /** Set when a query hit {@link MAX_EXPLORED}, so the counts are lower bounds. */
  readonly truncated: boolean;
};

/**
 * The printed form of a value, as the model reads it. Strings go through verbatim; an ECHO object is
 * a card (see {@link renderCard}); anything else is JSON with refs, ECHO objects, Effect data types
 * and errors spelled out, and long strings and arrays cut with a marker naming what was dropped.
 *
 * Synchronous and database-free, so it is also what a returned value and an out-of-process print
 * fall back to; {@link describe} adds what only a query can tell.
 */
export const formatValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (isEntity(value)) {
    return renderCard(value);
  }
  if (Array.isArray(value) && value.length > 0 && value.every(isEntity)) {
    return renderCards(value);
  }
  try {
    return JSON.stringify(toPrintable(value, 0), null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};

/**
 * {@link formatValue}, plus — for an ECHO object stored in a database — what the model cannot see by
 * reading its fields: the relations, children and referrers around it, each with the code that fetches
 * them, and the skills its type declares that the conversation has not bound. Never fails: a hint that
 * cannot be computed is left out rather than costing the model its output.
 */
export const describe = (value: unknown, context: DescribeContext): Effect.Effect<string, never, Database.Service> =>
  isEntity(value) && EchoEntity.getDatabase(value) !== undefined
    ? explore(value).pipe(
        Effect.map((neighbourhood) => [renderCard(value), ...renderHints(value, neighbourhood, context)].join('\n')),
        Effect.catchCause(() => Effect.succeed(renderCard(value))),
      )
    : Effect.succeed(formatValue(value));

/**
 * {@link describe} for one evaluation: past {@link MAX_EXPLORED_OBJECTS} objects it stops querying,
 * since each costs a query and a model printing in a loop wants the fields, not the counts.
 */
export const makeDescriber = (context: DescribeContext) => {
  let explored = 0;
  return (value: unknown): Effect.Effect<string, never, Database.Service> => {
    // Only a stored object is explored, so only a stored object spends the budget.
    const explorable = isEntity(value) && EchoEntity.getDatabase(value) !== undefined;
    if (!explorable || explored < MAX_EXPLORED_OBJECTS) {
      explored += explorable ? 1 : 0;
      return describe(value, context);
    }
    return Effect.succeed(
      `${renderCard(value)}\n  (relations not counted past ${MAX_EXPLORED_OBJECTS} objects in one call; print this one on its own to see them)`,
    );
  };
};

/** The neighbours of one object, counted by type, from one query bounded by {@link MAX_EXPLORED}. */
export const explore = (object: Entity): Effect.Effect<Neighbourhood, unknown, Database.Service> =>
  Effect.gen(function* () {
    const anchor = Query.select(Filter.id(object.id));
    // One union, bounded: the hints only have to tell the model there is something to explore, and
    // each row says which arm it came from, so nothing is gained by asking the arms separately.
    const rows = yield* Database.query(
      Query.all(anchor.sourceOf(), anchor.targetOf(), anchor.children(), anchor.referencedBy()).limit(MAX_EXPLORED + 1),
    ).run;
    const seen = rows.slice(0, MAX_EXPLORED);
    const isRelation = (row: Entity) => Relation.isRelation(row);
    const outgoing = seen.filter(
      (row) => isRelation(row) && endpointId(() => Relation.getSourceURI(row)) === object.id,
    );
    const incoming = seen.filter(
      (row) => isRelation(row) && !outgoing.includes(row) && endpointId(() => Relation.getTargetURI(row)) === object.id,
    );
    const children = seen.filter(
      (row) => !isRelation(row) && Obj.isObject(row) && safe(() => Obj.getParent(row))?.id === object.id,
    );
    const referrers = seen.filter((row) => !isRelation(row) && !children.includes(row));
    return {
      outgoing: groupBy(outgoing, (relation) => [[typeKey(relation)]]),
      incoming: groupBy(incoming, (relation) => [[typeKey(relation)]]),
      children: groupBy(children, (child) => [[typeKey(child)]]),
      referrers: groupBy(referrers, (referrer) => {
        // A ref nested below the top level is still a referrer, just one with no field to name.
        const fields = referringFields(referrer, object.id);
        return fields.length > 0 ? fields.map((field) => [typeKey(referrer), field] as const) : [[typeKey(referrer)]];
      }),
      truncated: rows.length > MAX_EXPLORED,
    };
  });

/** The object id a relation endpoint's URI names, or undefined when it cannot be read. */
const endpointId = (uri: () => unknown): string | undefined => {
  const text = safe(() => String(uri()));
  return text?.slice(text.lastIndexOf('/') + 1);
};

/** The hint lines appended to a card: counts first, then the code that fetches each group. */
const renderHints = (
  object: Entity,
  { outgoing, incoming, children, referrers, truncated }: Neighbourhood,
  { syntax, skills }: DescribeContext,
): string[] => {
  const id = object.id;
  const lines: string[] = [];
  const more = truncated ? '+' : '';
  const fetches: string[] = [];

  const relationLine = (groups: readonly Group[], direction: 'out' | 'in') => {
    for (const { type, count } of groups.slice(0, MAX_GROUPS)) {
      fetches.push(`${syntax.relations(id, type, direction)}  // ${count}${more} ${direction} ${shortName(type)}`);
    }
    return groups.map(({ type, count }) => `${shortName(type)} ×${count}${more}`).join(', ');
  };

  const relations = [
    outgoing.length > 0 ? `out: ${relationLine(outgoing, 'out')}` : undefined,
    incoming.length > 0 ? `in: ${relationLine(incoming, 'in')}` : undefined,
  ].filter((part) => part !== undefined);
  lines.push(`  relations: ${relations.length > 0 ? relations.join('; ') : 'none'}`);

  if (children.length > 0) {
    fetches.push(`${syntax.children(id)}  // ${sum(children)}${more} children`);
    lines.push(`  children: ${groupsText(children, more)}`);
  }

  if (referrers.length > 0) {
    for (const { type, field, count } of referrers.slice(0, MAX_GROUPS)) {
      fetches.push(`${syntax.referrers(id, type, field)}  // ${count}${more} ${referrerName(type, field)}`);
    }
    lines.push(
      `  referenced by: ${referrers.map(({ type, field, count }) => `${referrerName(type, field)} ×${count}${more}`).join(', ')}`,
    );
  }

  const type = EchoEntity.getType(object);
  const declared = type ? Skill.annotatedSkillKeys(type) : [];
  if (declared.length > 0) {
    const bound = new Set(skills ?? []);
    lines.push(
      `  skills for this type: ${declared.map((key) => (skills === undefined || bound.has(key) ? key : `${key} (not enabled in this conversation)`)).join(', ')}`,
    );
  }

  if (fetches.length > 0) {
    lines.push('  fetch:', ...fetches.map((fetch) => `    ${fetch}`));
  }
  return lines;
};

const groupsText = (groups: readonly Group[], more: string): string =>
  groups.map(({ type, count }) => `${shortName(type)} ×${count}${more}`).join(', ');

const referrerName = (type: string, field: string | undefined): string =>
  field === undefined ? shortName(type) : `${shortName(type)}.${field}`;

const sum = (groups: readonly Group[]): number => groups.reduce((total, { count }) => total + count, 0);

/** Counts rows by the keys `keyOf` returns for each, most frequent first. */
const groupBy = <T>(rows: readonly T[], keyOf: (row: T) => readonly (readonly [string, string?])[]): Group[] => {
  const counts = new Map<string, Group>();
  for (const row of rows) {
    for (const [type, field] of keyOf(row)) {
      const key = `${type}\u0000${field ?? ''}`;
      const group = counts.get(key);
      counts.set(key, { type, field, count: (group?.count ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((left, right) => right.count - left.count);
};

/** The versioned DXN a query names this entity's type by. */
const typeKey = (entity: Entity): string => String(EchoEntity.getTypeURI(entity));

/** The fields of `referrer` that hold a reference (directly or in an array) to the object `id`. */
const referringFields = (referrer: Entity, id: string): string[] =>
  Object.entries(referrer).flatMap(([field, value]) => {
    const refs = Array.isArray(value) ? value : [value];
    return refs.some((ref) => Ref.isRef(ref) && targetId(ref) === id) ? [field] : [];
  });

//
// Cards.
//

type Entity = EchoEntity.Unknown;

const isEntity = (value: unknown): value is Entity => Obj.isObject(value) || Relation.isRelation(value);

/**
 * One ECHO object as the model reads it:
 *
 * ```
 * com.example.type.task 01J… "Write the docs"
 *   title: "Write the docs"
 *   owner: → com.example.type.person 01J… "Ada"
 *   parent: → com.example.type.project 01J… "Composer"
 * ```
 *
 * Fields follow the schema's order and titles; a field the schema hides from forms is named but not
 * shown unless it holds refs, and an unset optional one is left out.
 */
export const renderCard = (object: Entity): string => {
  const lines = [summary(object)];

  if (Relation.isRelation(object)) {
    lines.push(
      `  source: ${renderEndpoint(
        () => Relation.getSource(object),
        () => Relation.getSourceURI(object),
      )}`,
    );
    lines.push(
      `  target: ${renderEndpoint(
        () => Relation.getTarget(object),
        () => Relation.getTargetURI(object),
      )}`,
    );
  }

  const fields = schemaFields(object);
  const hidden: string[] = [];
  const names = fields ? Object.keys(fields) : Object.keys(object).filter((name) => name !== 'id');
  for (const name of names) {
    const ast = fields?.[name]?.ast;
    const value: unknown = readField(object, name);
    // Hidden from forms is not hidden from the model when the field holds refs: those are the
    // object's structure (a map's members, a document's parts), not presentation state.
    if (ast !== undefined && isHidden(ast) && !holdsRefs(value)) {
      hidden.push(name);
      continue;
    }
    if (value === undefined) {
      continue;
    }
    const title = ast !== undefined ? safe(() => SchemaAST.resolveTitle(ast)) : undefined;
    const heading = title !== undefined && normalize(title) !== normalize(name) ? `${name} (${title})` : name;
    lines.push(`  ${heading}: ${inline(value, 1)}`);
  }
  if (hidden.length > 0) {
    lines.push(`  hidden fields: ${hidden.join(', ')}`);
  }

  const parent = Obj.isObject(object) ? safe(() => Obj.getParent(object)) : undefined;
  if (parent !== undefined) {
    lines.push(`  parent: → ${summary(parent)}`);
  }
  return lines.join('\n');
};

/** An array of objects: cards up to {@link MAX_CARDS}, then one summary line per remaining object. */
const renderCards = (objects: readonly Entity[]): string => {
  const cards = objects.slice(0, MAX_CARDS).map(renderCard);
  const rest = objects.slice(MAX_CARDS);
  return [
    `${objects.length} ${objects.length === 1 ? 'object' : 'objects'}:`,
    ...cards,
    ...(rest.length > 0 ? [`… ${rest.length} more: ${rest.map(summary).join('; ')}`] : []),
  ].join('\n');
};

/** One line naming an object: its typename, id and label. */
const summary = (object: Entity): string => `${EchoEntity.getTypename(object) ?? 'object'} ${idAndLabel(object)}`;

const idAndLabel = (object: Entity): string => {
  const label = safe(() => EchoEntity.getLabel(object));
  return `${object.id}${label ? ` ${JSON.stringify(trimmed(label))}` : ''}`;
};

const renderEndpoint = (load: () => unknown, uri: () => unknown): string => {
  const endpoint = safe(load);
  return isEntity(endpoint) ? `→ ${summary(endpoint)}` : `→ ${String(safe(uri) ?? 'unresolved')}`;
};

/** A reference as one line: its target's summary when already loaded, its URI otherwise. */
const renderRef = (ref: Ref.Unknown): string => {
  const target = safe(() => ref.peek());
  return isEntity(target) ? `→ ${summary(target)}` : `→ ${String(ref.uri)} (not loaded)`;
};

/** A field value on one line of a card. */
const inline = (value: unknown, depth: number): string => {
  if (Ref.isRef(value)) {
    return renderRef(value);
  }
  if (Array.isArray(value) && value.some((item) => Ref.isRef(item))) {
    const more = value.length > MAX_ITEMS ? `, … ${value.length - MAX_ITEMS} more` : '';
    const shown = value.slice(0, MAX_ITEMS);
    const targets = shown.map((item) => (Ref.isRef(item) ? safe(() => item.peek()) : undefined));
    const typenames = new Set(targets.map((target) => (isEntity(target) ? EchoEntity.getTypename(target) : undefined)));
    const [typename] = typenames;
    // Stated once when every shown target shares it: a list of refs is usually all one type.
    if (typenames.size === 1 && typename !== undefined) {
      return `→ ${typename} ×${value.length} [${targets.map((target) => (isEntity(target) ? idAndLabel(target) : '?')).join(', ')}${more}]`;
    }
    return `[${shown.map((item) => (Ref.isRef(item) ? renderRef(item) : inline(item, depth + 1))).join(', ')}${more}]`;
  }
  const json = JSON.stringify(toPrintable(value, depth));
  return json ?? String(value);
};

const schemaFields = (object: Entity): Schema.Struct.Fields | undefined => {
  const type = safe(() => EchoEntity.getType(object));
  return type !== undefined && Type.isType(type) && 'fields' in type && type.fields ? type.fields : undefined;
};

/** A field the schema keeps out of forms is plumbing, not content the model reasons about. */
const isHidden = (ast: SchemaAST.AST): boolean =>
  Option.getOrUndefined(Annotation.FormInputAnnotation.getFromAst(ast)) === false;

const holdsRefs = (value: unknown): boolean =>
  Ref.isRef(value) || (Array.isArray(value) && value.some((item) => Ref.isRef(item)));

/** A field by name; an entity's fields are not declared on its static type. */
const readField = (object: object, name: string): unknown => Reflect.get(object, name);

const normalize = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

//
// JSON for everything else.
//

/**
 * A value with every part the model cannot read as JSON replaced by something it can: a ref or ECHO
 * object by its one-line summary, an Effect `Result`/`Exit` by its real fields, an error by its tag and
 * message, a long string or array cut with a marker.
 */
const toPrintable = (value: unknown, depth: number): unknown => {
  if (typeof value === 'string') {
    return trimmed(value);
  }
  if (typeof value === 'bigint') {
    return `${value}n`;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Ref.isRef(value)) {
    return renderRef(value);
  }
  if (isEntity(value)) {
    return depth > MAX_DEPTH ? summary(value) : entityFields(value, depth);
  }
  // Effect's data types carry their tag only in `toJSON`, and a `Result`'s names the `success` field
  // `value`, which sends a model reading the output after a field that does not exist.
  if (Result.isResult(value)) {
    return Result.isSuccess(value)
      ? { _tag: 'Success', success: toPrintable(value.success, depth + 1) }
      : { _tag: 'Failure', failure: toPrintable(value.failure, depth + 1) };
  }
  if (Exit.isExit(value)) {
    return Exit.isSuccess(value)
      ? { _tag: 'Success', value: toPrintable(value.value, depth + 1) }
      : { _tag: 'Failure', cause: Cause.pretty(value.cause) };
  }
  if (Option.isOption(value)) {
    return Option.isSome(value) ? { _tag: 'Some', value: toPrintable(value.value, depth + 1) } : { _tag: 'None' };
  }
  if (value instanceof Error) {
    return errorFields(value, depth);
  }
  if (depth > MAX_DEPTH) {
    return Array.isArray(value) ? `[… ${value.length} items]` : '{…}';
  }
  if (Array.isArray(value)) {
    const shown = value.slice(0, MAX_ITEMS).map((item) => toPrintable(item, depth + 1));
    return value.length > MAX_ITEMS ? [...shown, `… ${value.length - MAX_ITEMS} more items`] : shown;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPrintable(item, depth + 1)]));
};

/** A nested ECHO object as JSON: its summary under `@`, then its visible fields. */
const entityFields = (object: Entity, depth: number): Record<string, unknown> => {
  const fields = schemaFields(object);
  const names = fields ? Object.keys(fields) : Object.keys(object).filter((name) => name !== 'id');
  return {
    '@': summary(object),
    ...Object.fromEntries(
      names
        .filter((name) => !(fields?.[name] && isHidden(fields[name].ast) && !holdsRefs(readField(object, name))))
        .map((name) => [name, toPrintable(readField(object, name), depth + 1)] as const)
        .filter(([, item]) => item !== undefined),
    ),
  };
};

/**
 * An error as its tag, message and own fields. `JSON.stringify` prints an `Error` as `{}` — its
 * message and name are not enumerable — and a tagged error carries its detail in fields.
 */
const errorFields = (error: Error, depth: number): Record<string, unknown> => {
  const own = Object.fromEntries(
    Object.entries(error)
      .filter(([key]) => key !== 'stack')
      .map(([key, item]) => [key, toPrintable(item, depth + 1)]),
  );
  return {
    error: '_tag' in error && typeof error._tag === 'string' ? error._tag : error.name,
    ...(error.message.length > 0 && { message: trimmed(error.message) }),
    ...own,
  };
};

/** A string cut to {@link MAX_STRING} characters, with how many were dropped. */
const trimmed = (text: string): string =>
  text.length > MAX_STRING ? `${text.slice(0, MAX_STRING)}…[+${text.length - MAX_STRING} chars]` : text;

/** The last segment of a typename or DXN, e.g. `implements` for `dxn:com.example.relation.implements:0.1.0`. */
const shortName = (type: string): string => {
  const name = type.replace(/^dxn:/, '').replace(/:[^:]*$/, '');
  return name.slice(name.lastIndexOf('.') + 1);
};

const targetId = (ref: Ref.Unknown): string => String(ref.uri).slice(String(ref.uri).lastIndexOf('/') + 1);

/** A read that may throw on an object in an odd state (deleted, unresolved, mid-migration) is not worth a failed print. */
const safe = <T>(read: () => T): T | undefined => {
  try {
    return read();
  } catch {
    return undefined;
  }
};
