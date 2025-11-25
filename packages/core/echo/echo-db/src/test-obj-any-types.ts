// Test to determine which Obj.Any TypeScript is resolving to

import { type Obj } from '@dxos/echo';
import { type HasId } from '@dxos/echo/internal';

// Test 1: Does Obj.Any have an 'id' property?
type Test1 = Obj.Any extends HasId ? 'YES_HAS_ID' : 'NO_ID';

// Test 2: Can we access .id on a value of type Obj.Any?
function test2(obj: Obj.Any) {
  // This should work if Obj.Any is the instance interface
  const id = obj.id; // Should error if Obj.Any is schema type
  return id;
}

// Test 3: Can we use Obj.Any in a generic constraint and access .id?
function test3<T extends Obj.Any>(obj: T) {
  // This is the pattern used in echo-db code
  const id = obj.id; // Should error if T extends schema type
  return id;
}

// Test 4: Check if Obj.Any is assignable to HasId
type Test4 = Obj.Any extends HasId ? true : false;

// Test 5: What is the actual type of Obj.Any?
type Test5 = Obj.Any;

export type Results = {
  test1: Test1;
  test4: Test4;
  test5: Test5;
};
