//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter, Obj, Ref, Tag } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { QueryBuilder } from '../parser/index.ts';
import { matchesFilter } from './match-filter.ts';

const tagUrgent = Tag.make({ label: 'urgent' });
const tagLater = Tag.make({ label: 'later' });
const tags: Tag.Map = {
  [Obj.getURI(tagUrgent).toString()]: tagUrgent,
  [Obj.getURI(tagLater).toString()]: tagLater,
};

const builder = new QueryBuilder(tags);
const build = (input: string) => {
  const { filter } = builder.build(input);
  if (!filter) {
    throw new Error(`Failed to build filter: ${input}`);
  }
  return filter;
};

const makePerson = () =>
  Obj.make(TestSchema.Person, {
    name: 'Rich Burdon',
    email: 'rich@dxos.org',
    age: 42,
    address: { city: 'New York', coordinates: {} },
    fields: [{ label: 'role', value: 'Founder' }],
  });

const makeTask = (props: { title: string; description?: string }, tagged: Tag.Tag[] = []) => {
  const task = Obj.make(TestSchema.Task, props);
  if (tagged.length > 0) {
    Obj.update(task, (task) => {
      for (const tag of tagged) {
        Obj.addTag(task, Ref.make(tag));
      }
    });
  }
  return task;
};

describe('matchesFilter', () => {
  describe('text', () => {
    test('searches every top-level string property by default', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('burdon'), person)).to.be.true;
      expect(matchesFilter(build('dxos.org'), person)).to.be.true;
      expect(matchesFilter(build('absent'), person)).to.be.false;
    });

    test('ignores case', ({ expect }) => {
      expect(matchesFilter(build('RICH'), makePerson())).to.be.true;
    });

    test('does not match the object id', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build(person.id.slice(0, 8)), person)).to.be.false;
    });

    test('searches only what the host names', ({ expect }) => {
      const task = makeTask({ title: 'Ship it', description: 'Blocked on the migration.' });
      const titleOnly = { text: (task: TestSchema.Task) => [task.title] };
      expect(matchesFilter(build('migration'), task)).to.be.true;
      expect(matchesFilter(build('migration'), task, titleOnly)).to.be.false;
      expect(matchesFilter(build('ship'), task, titleOnly)).to.be.true;
    });

    test('fragments are all required', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('rich burdon'), person)).to.be.true;
      expect(matchesFilter(build('rich absent'), person)).to.be.false;
    });
  });

  describe('properties', () => {
    test('a string property matches as a case-insensitive substring', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('email:RICH'), person)).to.be.true;
      expect(matchesFilter(build('email:other'), person)).to.be.false;
    });

    test('a dotted path reads a nested field', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('address.city:york'), person)).to.be.true;
      expect(matchesFilter(build('address.city:boston'), person)).to.be.false;
    });

    test('an object value matches on any field', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('address:york'), person)).to.be.true;
      expect(matchesFilter(build('address:boston'), person)).to.be.false;
    });

    test('an array value matches on any element', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('fields:founder'), person)).to.be.true;
      expect(matchesFilter(build('fields:engineer'), person)).to.be.false;
    });

    test('a number compares by equality and order', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('age:42'), person)).to.be.true;
      expect(matchesFilter(build('age:41'), person)).to.be.false;
      expect(matchesFilter(Filter.props({ age: Filter.gt(40) }), person)).to.be.true;
      expect(matchesFilter(Filter.props({ age: Filter.lte(41) }), person)).to.be.false;
    });

    test('ordering across types matches nothing', ({ expect }) => {
      expect(matchesFilter(Filter.props({ age: Filter.gt('40') }), makePerson())).to.be.false;
    });

    test('an absent property matches nothing', ({ expect }) => {
      expect(matchesFilter(build('username:rich'), makePerson())).to.be.false;
    });

    test('an object literal narrows the named fields', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('{ email: "rich@dxos.org" }'), person)).to.be.true;
      expect(matchesFilter(build('{ email: "other@dxos.org" }'), person)).to.be.false;
    });
  });

  describe('identity', () => {
    test('a type term matches the object type', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('type:com.example.type.person'), person)).to.be.true;
      expect(matchesFilter(build('type:com.example.type.task'), person)).to.be.false;
      // A typed filter carries the version; the DSL term does not.
      expect(matchesFilter(Filter.type(TestSchema.Person), person)).to.be.true;
      expect(matchesFilter(build('type:com.example.type.per'), person)).to.be.false;
    });

    test('an id filter matches only the ids it names', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(Filter.id(person.id), person)).to.be.true;
      expect(matchesFilter(Filter.id(makePerson().id), person)).to.be.false;
    });
  });

  describe('tags', () => {
    test('a tag term reads the object meta by default', ({ expect }) => {
      const tagged = makeTask({ title: 'Ship it' }, [tagUrgent]);
      expect(matchesFilter(build('#urgent'), tagged)).to.be.true;
      expect(matchesFilter(build('#later'), tagged)).to.be.false;
      expect(matchesFilter(build('#urgent'), makeTask({ title: 'Ship it' }))).to.be.false;
    });

    test('a host can supply the tags', ({ expect }) => {
      const task = makeTask({ title: 'Ship it' });
      const tagged = { tags: () => [Obj.getURI(tagLater).toString()] };
      expect(matchesFilter(build('#later'), task, tagged)).to.be.true;
      expect(matchesFilter(build('#urgent'), task, tagged)).to.be.false;
    });
  });

  describe('operators', () => {
    test('OR matches either side', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('absent OR rich'), person)).to.be.true;
      expect(matchesFilter(build('absent OR missing'), person)).to.be.false;
    });

    test('NOT inverts', ({ expect }) => {
      const person = makePerson();
      expect(matchesFilter(build('NOT absent'), person)).to.be.true;
      expect(matchesFilter(build('NOT rich'), person)).to.be.false;
      expect(matchesFilter(build('NOT email:rich'), person)).to.be.false;
    });

    test('terms compose', ({ expect }) => {
      const task = makeTask({ title: 'Ship the tasks section' }, [tagUrgent]);
      expect(matchesFilter(build('#urgent tasks'), task)).to.be.true;
      expect(matchesFilter(build('#later tasks'), task)).to.be.false;
    });

    test('a node the evaluator does not know fails closed', ({ expect }) => {
      expect(matchesFilter(Filter.childOf(makePerson()), makePerson())).to.be.false;
    });
  });
});
