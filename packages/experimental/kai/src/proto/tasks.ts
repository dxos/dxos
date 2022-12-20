
import { EchoSchema, EchoObjectBase } from "@dxos/echo-db2";

const schemaJson = "{\"nested\":{\"kai\":{\"nested\":{\"example\":{\"nested\":{\"tasks\":{\"nested\":{\"Task\":{\"options\":{\"(object)\":true},\"fields\":{\"id\":{\"type\":\"string\",\"id\":1},\"title\":{\"type\":\"string\",\"id\":2},\"count\":{\"type\":\"int32\",\"id\":3},\"completed\":{\"type\":\"bool\",\"id\":4}}},\"Person\":{\"options\":{\"(object)\":true},\"fields\":{\"id\":{\"type\":\"string\",\"id\":1},\"name\":{\"type\":\"string\",\"id\":2},\"contact\":{\"type\":\"Contact\",\"id\":3}}},\"Contact\":{\"options\":{\"(object)\":true},\"fields\":{\"id\":{\"type\":\"string\",\"id\":1},\"email\":{\"type\":\"string\",\"id\":2}}}}}}}}}}}"
export const schema = EchoSchema.fromJson(schemaJson);

    export class Task extends EchoObjectBase {
      static readonly type = schema.getType('kai.example.tasks.Task');

      static filter(opts?: { title?: string,count?: number,completed?: boolean }) {
        return Task.type.createFilter(opts);
      }

      constructor(opts?: { title?: string,count?: number,completed?: boolean }) {
        super(opts, Task.type);
      }
    
      declare title: string;
declare count: number;
declare completed: boolean;
    }
    schema.registerPrototype(Task);
  

    export class Person extends EchoObjectBase {
      static readonly type = schema.getType('kai.example.tasks.Person');

      static filter(opts?: { name?: string,contact?: Contact }) {
        return Person.type.createFilter(opts);
      }

      constructor(opts?: { name?: string,contact?: Contact }) {
        super(opts, Person.type);
      }
    
      declare name: string;
declare contact: Contact;
    }
    schema.registerPrototype(Person);
  

    export class Contact extends EchoObjectBase {
      static readonly type = schema.getType('kai.example.tasks.Contact');

      static filter(opts?: { email?: string }) {
        return Contact.type.createFilter(opts);
      }

      constructor(opts?: { email?: string }) {
        super(opts, Contact.type);
      }
    
      declare email: string;
    }
    schema.registerPrototype(Contact);
  
