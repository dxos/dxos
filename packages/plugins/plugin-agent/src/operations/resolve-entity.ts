//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import { MemoryOperation } from '#types';

import { AgentOperationError } from './errors.ts';

const handler: Operation.WithHandler<typeof MemoryOperation.ResolveEntity> = MemoryOperation.ResolveEntity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, handles = [], kind = 'person' }) {
      const trimmed = name?.trim();
      if (!trimmed && handles.length === 0) {
        return yield* Effect.fail(new AgentOperationError({ message: 'Pass a name or at least one handle.' }));
      }

      if (kind === 'organization') {
        const organizations = yield* Database.query(Filter.type(Organization.Organization)).run;
        const match = trimmed ? organizations.find((organization) => sameName(organization.name, trimmed)) : undefined;
        if (match) {
          return { entity: Ref.make<Obj.Unknown>(match), created: false };
        }

        const organization = yield* Database.add(Organization.make({ name: trimmed }));
        return { entity: Ref.make<Obj.Unknown>(organization), created: true };
      }

      const people = yield* Database.query(Filter.type(Person.Person)).run;
      // A handle is authoritative; the name only breaks the tie when no handle is known yet.
      const match =
        people.find((person) => handles.some((handle) => hasHandle(person, handle))) ??
        (trimmed ? byName(people, trimmed) : undefined);

      if (match) {
        const missing = handles.filter((handle) => !hasHandle(match, handle));
        if (missing.length > 0) {
          Obj.update(match, (match) => {
            if (match.identities) {
              match.identities.push(...missing);
            } else {
              match.identities = [...missing];
            }
          });
        }
        return { entity: Ref.make<Obj.Unknown>(match), created: false };
      }

      const person = yield* Database.add(Person.make({ fullName: trimmed, identities: [...handles] }));
      return { entity: Ref.make<Obj.Unknown>(person), created: true };
    }),
  ),
);

export default handler;

const sameName = (candidate: string | undefined, name: string) =>
  candidate !== undefined && candidate.trim().toLowerCase() === name.toLowerCase();

const firstName = (fullName: string | undefined) => fullName?.trim().split(/\s+/)[0];

/**
 * The person a name refers to: by full, preferred or nick name, or a handle written as a name (a Discord username),
 * else by first name when exactly one person has it. Creating a person for an alias splits what is known about them.
 */
const byName = (people: readonly Person.Person[], name: string): Person.Person | undefined =>
  people.find(
    (person) =>
      sameName(person.fullName, name) ||
      sameName(person.preferredName, name) ||
      sameName(person.nickname, name) ||
      (person.identities ?? []).some((identity) => sameName(identity.value, name)),
  ) ?? unique(people.filter((person) => sameName(firstName(person.fullName), name)));

const unique = <T>(matches: readonly T[]): T | undefined => (matches.length === 1 ? matches[0] : undefined);

const hasHandle = (person: Person.Person, handle: MemoryOperation.Handle) =>
  (person.identities ?? []).some(
    (identity) => identity.value === handle.value && (handle.label === undefined || identity.label === handle.label),
  );
