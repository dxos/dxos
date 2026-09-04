/**
 * ECHO Storage Performance Benchmarks
 * Compares object creation, access, and update performance across three storage backends:
 * A) No database (in-memory objects only)
 * B) Saved to database with automerge
 * C) Saved to feed storage
 */

import { Trigger, asyncTimeout } from '@dxos/async';
import { Context } from '@dxos/context';
import { Entity, Feed, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Schema from 'effect/Schema';

// Define test schema
const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
  email: Schema.String,
  phone: Schema.String,
  address: Schema.String,
  city: Schema.String,
  country: Schema.String,
  zip: Schema.String,
  company: Schema.String,
  title: Schema.String,
  department: Schema.String,
  startDate: Schema.String,
  salary: Schema.Number,
  active: Schema.Boolean,
  verified: Schema.Boolean,
  lastLogin: Schema.String,
  notes: Schema.String,
  tags: Schema.Array(Schema.String),
  metadata: Schema.Record({ key: Schema.String, value: Schema.String }),
}).pipe(Schema.brand('PersonSchema'));

type Person = Schema.Schema.Type<typeof PersonSchema>;

const PersonType: Type.AnyEntity = Entity.define(PersonSchema, { typename: 'Person' });

// Simpler type with just 1 prop for basic tests
const SimplePersonSchema = Schema.Struct({
  name: Schema.String,
}).pipe(Schema.brand('SimplePersonSchema'));

const SimplePersonType: Type.AnyEntity = Entity.define(SimplePersonSchema, { typename: 'SimplePerson' });

async function benchmarkInMemory(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('A) IN-MEMORY (No Database)');
  console.log('='.repeat(70));

  const iterations = 10_000;

  // 1. Obj.make with 1 property
  console.log('\n1. Obj.make (1 prop) - 10k iterations:');
  const start1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const obj = Obj.make(SimplePersonType, { name: `Person ${i}` });
  }
  const time1 = performance.now() - start1;
  console.log(`  ${time1.toFixed(2)}ms (${(iterations / time1 * 1000).toFixed(0)} ops/sec)`);

  // 2. Obj.make with 20 properties
  console.log('\n2. Obj.make (20 props) - 10k iterations:');
  const start2 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const obj = Obj.make(PersonType, {
      name: `Person ${i}`,
      age: 30 + (i % 40),
      email: `person${i}@example.com`,
      phone: `555-${String(i).padStart(4, '0')}`,
      address: `123 Main St Apt ${i}`,
      city: 'San Francisco',
      country: 'USA',
      zip: '94105',
      company: 'Tech Corp',
      title: 'Engineer',
      department: 'Engineering',
      startDate: '2024-01-01',
      salary: 150000 + (i * 1000),
      active: true,
      verified: i % 2 === 0,
      lastLogin: new Date().toISOString(),
      notes: `Notes for person ${i}`,
      tags: ['employee', 'active'],
      metadata: { key: 'value', type: 'person' },
    });
  }
  const time2 = performance.now() - start2;
  console.log(`  ${time2.toFixed(2)}ms (${(iterations / time2 * 1000).toFixed(0)} ops/sec)`);

  // 3. Property access on in-memory object
  console.log('\n3. Property read - 1M iterations:');
  const obj = Obj.make(PersonType, {
    name: 'Test Person',
    age: 30,
    email: 'test@example.com',
    phone: '555-1234',
    address: '123 Main St',
    city: 'SF',
    country: 'USA',
    zip: '94105',
    company: 'Tech',
    title: 'Engineer',
    department: 'Eng',
    startDate: '2024-01-01',
    salary: 150000,
    active: true,
    verified: true,
    lastLogin: new Date().toISOString(),
    notes: 'Test',
    tags: [],
    metadata: {},
  });
  const readIterations = 1_000_000;
  const start3 = performance.now();
  for (let i = 0; i < readIterations; i++) {
    const _ = obj.name;
  }
  const time3 = performance.now() - start3;
  console.log(`  ${time3.toFixed(2)}ms (${(readIterations / time3 * 1000).toFixed(0)} ops/sec)`);

  // 4. Update 1 property
  console.log('\n4. Obj.update (1 prop) - 10k iterations:');
  const updateIterations = 10_000;
  const start4 = performance.now();
  for (let i = 0; i < updateIterations; i++) {
    Obj.update(obj, { name: `Updated ${i}` });
  }
  const time4 = performance.now() - start4;
  console.log(`  ${time4.toFixed(2)}ms (${(updateIterations / time4 * 1000).toFixed(0)} ops/sec)`);

  // 5. Update 20 properties
  console.log('\n5. Obj.update (20 props) - 1k iterations:');
  const updateIterations20 = 1_000;
  const start5 = performance.now();
  for (let i = 0; i < updateIterations20; i++) {
    Obj.update(obj, {
      name: `Person ${i}`,
      age: 30 + (i % 40),
      email: `person${i}@example.com`,
      phone: `555-${String(i).padStart(4, '0')}`,
      address: `123 Main St Apt ${i}`,
      city: 'San Francisco',
      country: 'USA',
      zip: '94105',
      company: 'Tech Corp',
      title: 'Engineer',
      department: 'Engineering',
      startDate: '2024-01-01',
      salary: 150000 + (i * 1000),
      active: true,
      verified: i % 2 === 0,
      lastLogin: new Date().toISOString(),
      notes: `Notes for person ${i}`,
      tags: ['employee', 'active'],
      metadata: { key: 'value', type: 'person' },
    });
  }
  const time5 = performance.now() - start5;
  console.log(`  ${time5.toFixed(2)}ms (${(updateIterations20 / time5 * 1000).toFixed(0)} ops/sec)`);
}

async function benchmarkDatabase(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('B) SAVED TO DATABASE (with Automerge)');
  console.log('='.repeat(70));

  const builder = await new EchoTestBuilder().open();

  try {
    const peer = await builder.createPeer({ types: [PersonType, SimplePersonType] });
    const db = await peer.createDatabase();

    const iterations = 100;

    // 1. Obj.make + db.add with 1 property
    console.log('\n1. Obj.make (1 prop) + db.add - 100 iterations:');
    const start1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const obj = Obj.make(SimplePersonType, { name: `Person ${i}` });
      db.add(obj);
    }
    await db.flush();
    const time1 = performance.now() - start1;
    console.log(`  ${time1.toFixed(2)}ms (${(iterations / time1 * 1000).toFixed(0)} ops/sec)`);

    // 2. Obj.make + db.add with 20 properties
    console.log('\n2. Obj.make (20 props) + db.add - 100 iterations:');
    const start2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const obj = Obj.make(PersonType, {
        name: `Person ${i}`,
        age: 30 + (i % 40),
        email: `person${i}@example.com`,
        phone: `555-${String(i).padStart(4, '0')}`,
        address: `123 Main St Apt ${i}`,
        city: 'San Francisco',
        country: 'USA',
        zip: '94105',
        company: 'Tech Corp',
        title: 'Engineer',
        department: 'Engineering',
        startDate: '2024-01-01',
        salary: 150000 + (i * 1000),
        active: true,
        verified: i % 2 === 0,
        lastLogin: new Date().toISOString(),
        notes: `Notes for person ${i}`,
        tags: ['employee', 'active'],
        metadata: { key: 'value', type: 'person' },
      });
      db.add(obj);
    }
    await db.flush();
    const time2 = performance.now() - start2;
    console.log(`  ${time2.toFixed(2)}ms (${(iterations / time2 * 1000).toFixed(0)} ops/sec)`);

    // 3. Property access on db object
    console.log('\n3. Property read - 10k iterations:');
    const objects = db.objects as any[];
    const readIterations = 10_000;
    const start3 = performance.now();
    for (let i = 0; i < readIterations; i++) {
      const obj = objects[i % objects.length];
      if (obj?.name) {
        const _ = obj.name;
      }
    }
    const time3 = performance.now() - start3;
    console.log(`  ${time3.toFixed(2)}ms (${(readIterations / time3 * 1000).toFixed(0)} ops/sec)`);

    // 4. Update 1 property
    console.log('\n4. Obj.update (1 prop) - 100 iterations:');
    const updateIterations = 100;
    const start4 = performance.now();
    for (let i = 0; i < updateIterations; i++) {
      const obj = objects[i % objects.length];
      if (obj) {
        Obj.update(obj, { name: `Updated ${i}` });
      }
    }
    await db.flush();
    const time4 = performance.now() - start4;
    console.log(`  ${time4.toFixed(2)}ms (${(updateIterations / time4 * 1000).toFixed(0)} ops/sec)`);

    // 5. Update 20 properties
    console.log('\n5. Obj.update (20 props) - 50 iterations:');
    const updateIterations20 = 50;
    const start5 = performance.now();
    for (let i = 0; i < updateIterations20; i++) {
      const obj = objects[i % objects.length];
      if (obj) {
        Obj.update(obj, {
          name: `Person ${i}`,
          age: 30 + (i % 40),
          email: `person${i}@example.com`,
          phone: `555-${String(i).padStart(4, '0')}`,
          address: `123 Main St Apt ${i}`,
          city: 'San Francisco',
          country: 'USA',
          zip: '94105',
          company: 'Tech Corp',
          title: 'Engineer',
          department: 'Engineering',
          startDate: '2024-01-01',
          salary: 150000 + (i * 1000),
          active: true,
          verified: i % 2 === 0,
          lastLogin: new Date().toISOString(),
          notes: `Notes for person ${i}`,
          tags: ['employee', 'active'],
          metadata: { key: 'value', type: 'person' },
        });
      }
    }
    await db.flush();
    const time5 = performance.now() - start5;
    console.log(`  ${time5.toFixed(2)}ms (${(updateIterations20 / time5 * 1000).toFixed(0)} ops/sec)`);

    await db.close();
  } finally {
    await builder.close();
  }
}

async function benchmarkFeed(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('C) SAVED TO FEED (Feed Storage Backend)');
  console.log('='.repeat(70));

  const builder = await new EchoTestBuilder().open();

  try {
    const peer = await builder.createPeer({ types: [Feed.Feed, PersonType, SimplePersonType] });
    const db = await peer.createDatabase();

    const feed = db.add(Feed.make({ name: 'people' }));
    const iterations = 100;

    // 1. Obj.make + appendToFeed with 1 property
    console.log('\n1. Obj.make (1 prop) + feed.append - 100 iterations:');
    const start1 = performance.now();
    const objects1 = [];
    for (let i = 0; i < iterations; i++) {
      const obj = Obj.make(SimplePersonType, { name: `Person ${i}` });
      objects1.push(obj);
    }
    await db.appendToFeed(feed, objects1);
    const time1 = performance.now() - start1;
    console.log(`  ${time1.toFixed(2)}ms (${(iterations / time1 * 1000).toFixed(0)} ops/sec)`);

    // 2. Obj.make + appendToFeed with 20 properties
    console.log('\n2. Obj.make (20 props) + feed.append - 100 iterations:');
    const start2 = performance.now();
    const objects2 = [];
    for (let i = 0; i < iterations; i++) {
      const obj = Obj.make(PersonType, {
        name: `Person ${i}`,
        age: 30 + (i % 40),
        email: `person${i}@example.com`,
        phone: `555-${String(i).padStart(4, '0')}`,
        address: `123 Main St Apt ${i}`,
        city: 'San Francisco',
        country: 'USA',
        zip: '94105',
        company: 'Tech Corp',
        title: 'Engineer',
        department: 'Engineering',
        startDate: '2024-01-01',
        salary: 150000 + (i * 1000),
        active: true,
        verified: i % 2 === 0,
        lastLogin: new Date().toISOString(),
        notes: `Notes for person ${i}`,
        tags: ['employee', 'active'],
        metadata: { key: 'value', type: 'person' },
      });
      objects2.push(obj);
    }
    await db.appendToFeed(feed, objects2);
    const time2 = performance.now() - start2;
    console.log(`  ${time2.toFixed(2)}ms (${(iterations / time2 * 1000).toFixed(0)} ops/sec)`);

    // 3. Property access on feed objects
    console.log('\n3. Property read - 10k iterations:');
    const feedObjects = db.objects as any[];
    const readIterations = 10_000;
    const start3 = performance.now();
    for (let i = 0; i < readIterations; i++) {
      const obj = feedObjects[i % feedObjects.length];
      if (obj?.name) {
        const _ = obj.name;
      }
    }
    const time3 = performance.now() - start3;
    console.log(`  ${time3.toFixed(2)}ms (${(readIterations / time3 * 1000).toFixed(0)} ops/sec)`);

    // 4. Update 1 property (on feed objects)
    console.log('\n4. Obj.update (1 prop) - 100 iterations:');
    const updateIterations = 100;
    const start4 = performance.now();
    for (let i = 0; i < updateIterations; i++) {
      const obj = feedObjects[i % feedObjects.length];
      if (obj) {
        Obj.update(obj, { name: `Updated ${i}` });
      }
    }
    await db.flush();
    const time4 = performance.now() - start4;
    console.log(`  ${time4.toFixed(2)}ms (${(updateIterations / time4 * 1000).toFixed(0)} ops/sec)`);

    // 5. Update 20 properties (on feed objects)
    console.log('\n5. Obj.update (20 props) - 50 iterations:');
    const updateIterations20 = 50;
    const start5 = performance.now();
    for (let i = 0; i < updateIterations20; i++) {
      const obj = feedObjects[i % feedObjects.length];
      if (obj) {
        Obj.update(obj, {
          name: `Person ${i}`,
          age: 30 + (i % 40),
          email: `person${i}@example.com`,
          phone: `555-${String(i).padStart(4, '0')}`,
          address: `123 Main St Apt ${i}`,
          city: 'San Francisco',
          country: 'USA',
          zip: '94105',
          company: 'Tech Corp',
          title: 'Engineer',
          department: 'Engineering',
          startDate: '2024-01-01',
          salary: 150000 + (i * 1000),
          active: true,
          verified: i % 2 === 0,
          lastLogin: new Date().toISOString(),
          notes: `Notes for person ${i}`,
          tags: ['employee', 'active'],
          metadata: { key: 'value', type: 'person' },
        });
      }
    }
    await db.flush();
    const time5 = performance.now() - start5;
    console.log(`  ${time5.toFixed(2)}ms (${(updateIterations20 / time5 * 1000).toFixed(0)} ops/sec)`);

    await db.close();
  } finally {
    await builder.close();
  }
}

async function main() {
  console.log('\nECHO Storage Backend Performance Benchmarks');
  console.log('='.repeat(70));
  console.log('Comparing three storage scenarios:');
  console.log('A) In-memory objects (no persistence)');
  console.log('B) Database with Automerge (persistent)');
  console.log('C) Feed storage (ordered, persistent)');

  try {
    await benchmarkInMemory();
    await benchmarkDatabase();
    await benchmarkFeed();

    console.log('\n' + '='.repeat(70));
    console.log('Benchmark complete!');
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
