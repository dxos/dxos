//
// Copyright 2025 DXOS.org
//

// Correct usage - will pass the rule.
import * as Schema from './Schema';

// Incorrect usage - will fail the rule (commented out to avoid errors).
// import { foo } from './Schema';
// import Schema from './Schema';
// import * as WrongName from './Schema';

// Correct export.
export * as Schema from './Schema';

// Incorrect exports (commented out).
// export * from './Schema';
// export { foo } from './Schema';
// export * as WrongName from './Schema';

console.log(Schema.foo);
