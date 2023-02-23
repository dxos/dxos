# ECHO API

*   Graph object module
    *   Items
        *   Parent-child
    *   Links
*   Query
*   Item
    *   Model
        *   DocumentModel: Document (JSON)
            *   Key-value mutations
*   Transactions

```protobuf
message Contact {
  string name = 1;
  string fullname = 2;
  repeated string emails = 3;
}
```

```ts

// Generated from proto
// in ./src/generated/types
type Contact = {
  name: { first: string; last: string }
  fullname: string
  emails: string[]
}

// Add helpers
// in ./src/types/Contact.ts
import { Base } from '@dxos/echo-db'; //
import { Contact as ContactBase } from './src/generated/types';
class Contact extends Base<Contact> {
  get fullname: () => `${this.name.first} ${this.name.last}`;
}


db.transaction((context) => {
 /// 
}).commit()


// Create database
const db = ECHO.create();

// Create object of given type
const obj = db.createObject(Contact({
  name: {
    first: 'Alice',
    last: 'Cooper'
  }
});

//
db.create(Contacts({ name: {} }) 

console.log(alice.name.first);
console.log(alice.fullName);






// Dymnamic loading



// Mutate object
obj.set('name', 'Alice');

obj.name = 'Alice';
obj.emails.push('alice@example.com');




// Batch/transactions


// Query objects
db.query()

```

