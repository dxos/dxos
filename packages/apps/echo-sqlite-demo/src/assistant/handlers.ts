//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, Entity, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { foreignKey } from '@dxos/echo-worker';
import { BaseError } from '@dxos/errors';
import { DXN } from '@dxos/keys';

import { Event, Organization, Person, types } from '../schema.ts';
import { CreateRecord, FindRecords, LinkRecords } from './operations.ts';

/** What the model got wrong — a type the graph does not hold, an id that is not there. */
export class GraphToolError extends BaseError.extend('GraphToolError') {
  constructor(message: string) {
    super({ message });
  }
}

/** Every synced object carries a foreign key; a record the assistant creates is no exception. */
const meta = () => ({ [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] } });

const text = (value: unknown): string => (value === undefined || value === null ? '' : String(value));

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(text) : value === undefined ? [] : [text(value)];

const find = (id: string) => Database.query(Query.select(Filter.id(id))).run.pipe(Effect.map(([found]) => found));

export const findRecords = FindRecords.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ typename, text: search, limit = 20 }) {
      const selection = search
        ? Query.all(...search.split(' ').map((term: string) => Query.select(Filter.text(term, { type: 'full-text' }))))
        : Query.select(Filter.everything());
      const query = (typename ? selection.select(Filter.type(DXN.make(typename))) : selection).limit(limit);
      yield* Database.flush();
      const results = yield* Database.query(query).run;
      return results.map((object) => Entity.toJSON(object));
    }),
  ),
);

export const createRecord = CreateRecord.pipe(
  Operation.withHandler(
    // One branch per type, as the form has: each type's fields are its own, and a value the model
    // invented for a field the type does not have should fail here rather than be stored.
    Effect.fn(function* ({ typename, values }) {
      switch (typename) {
        case Type.getTypename(Organization): {
          const website = values.website ? { website: text(values.website) } : {};
          return Entity.toJSON(
            yield* Database.add(Obj.make(Organization, { ...meta(), name: text(values.name), ...website })),
          );
        }

        case Type.getTypename(Person): {
          return Entity.toJSON(
            yield* Database.add(Obj.make(Person, { ...meta(), name: text(values.name), email: strings(values.email) })),
          );
        }

        case Type.getTypename(Event): {
          const description = values.description ? { description: text(values.description) } : {};
          return Entity.toJSON(
            yield* Database.add(
              Obj.make(Event, { ...meta(), title: text(values.title), ...description, attendees: [] }),
            ),
          );
        }

        default:
          return yield* Effect.fail(
            new GraphToolError(`No such type: ${typename}. The graph holds ${types.map(Type.getTypename).join(', ')}.`),
          );
      }
    }),
  ),
);

export const linkRecords = LinkRecords.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ source, property, target }) {
      const from = yield* find(source);
      const to = yield* find(target);
      if (!from || !to) {
        return yield* Effect.fail(new GraphToolError(`No record with id ${from ? target : source}.`));
      }

      // A list gains the target; a single-valued property is replaced.
      const current = (from as Record<string, unknown>)[property];
      const next = Array.isArray(current)
        ? [...current.filter(Ref.isRef), Ref.make(to as never)]
        : Ref.make(to as never);
      Obj.update(from, (from) => {
        Obj.setValue(from, [property], next);
      });
      yield* Database.flush();
      return Entity.toJSON(from);
    }),
  ),
);

export const GraphHandlers = OperationHandlerSet.make(findRecords, createRecord, linkRecords);
