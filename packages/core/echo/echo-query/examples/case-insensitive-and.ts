import { QueryBuilder } from '../src/parser/query-builder';

// Example demonstrating case-insensitive AND operator
const queryBuilder = new QueryBuilder();

const queries = [
  'type:dxos.org/type/Person AND { name: "Alice" }',
  'type:dxos.org/type/Person and { name: "Alice" }',
  'type:dxos.org/type/Person And { name: "Alice" }',
];

console.log('Case-insensitive AND operator examples:\n');

queries.forEach((query) => {
  const filter = queryBuilder.build(query);
  console.log(`Query: "${query}"`);
  console.log(`Valid: ${filter !== null}`);
  console.log(`Filter:`, JSON.stringify(filter, null, 2));
  console.log('---');
});
