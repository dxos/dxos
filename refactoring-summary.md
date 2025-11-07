# DataType Import Refactoring Summary

## Problem
- `DataType` is imported from `@dxos/schema` but is not actually exported from that package
- This causes TypeScript errors as seen in the diagnostics
- The code uses `DataType` as a namespace to access various types like `DataType.Organization.Organization`

## Types Location
Based on the analysis, the types are split between two packages:

### From `@dxos/types`:
- Organization
- Person  
- Task
- Project
- Event
- Message
- ContentBlock
- Actor
- Geo

### From `@dxos/schema`:
- Collection
- View
- Text
- StoredSchema

## Refactoring Strategy

### Option 1: Direct Imports (Recommended)
Replace DataType namespace with direct imports:

```typescript
// Before
import { DataType } from '@dxos/schema';
const org = DataType.Organization.Organization;

// After
import { Organization } from '@dxos/types';
const org = Organization.Organization;
```

### Option 2: Create DataType namespace
Create a barrel export that recreates the DataType namespace:

```typescript
// In some central location (e.g., @dxos/schema/src/index.ts)
import * as Organization from '@dxos/types/Organization';
import * as Person from '@dxos/types/Person';
// ... etc

export const DataType = {
  Organization,
  Person,
  // ... etc
};
```

## Files Affected
- ~200 files across the codebase use DataType
- Most common usage patterns:
  - DataType.Organization.Organization
  - DataType.Person.Person
  - DataType.Task.Task
  - DataType.Collection.Collection
  - DataType.View.View
  - DataType.Text.Text
  - DataType.Message.Message

## Next Steps
1. Decide on refactoring approach
2. Update imports in all affected files
3. Run tests to ensure nothing breaks
4. Update any documentation