
import { EchoSchema, EchoObjectBase, TypeFilter, OrderedSet } from "@dxos/echo-db2";

const schemaJson = "{\"nested\":{\"kai\":{\"nested\":{\"example\":{\"nested\":{\"tasks\":{\"nested\":{\"Project\":{\"options\":{\"(object)\":true},\"fields\":{\"title\":{\"type\":\"string\",\"id\":1},\"team\":{\"rule\":\"repeated\",\"type\":\"Contact\",\"id\":2},\"tasks\":{\"rule\":\"repeated\",\"type\":\"Task\",\"id\":3}}},\"Task\":{\"options\":{\"(object)\":true},\"fields\":{\"id\":{\"type\":\"string\",\"id\":1},\"title\":{\"type\":\"string\",\"id\":2},\"count\":{\"type\":\"int32\",\"id\":3},\"completed\":{\"type\":\"bool\",\"id\":4},\"assignee\":{\"type\":\"Contact\",\"id\":5}}},\"Address\":{\"fields\":{\"city\":{\"type\":\"string\",\"id\":1},\"state\":{\"type\":\"string\",\"id\":2},\"zip\":{\"type\":\"string\",\"id\":3}}},\"Contact\":{\"options\":{\"(object)\":true},\"fields\":{\"id\":{\"type\":\"string\",\"id\":1},\"name\":{\"type\":\"string\",\"id\":2},\"username\":{\"type\":\"string\",\"id\":3},\"email\":{\"type\":\"string\",\"id\":4},\"address\":{\"type\":\"Address\",\"id\":5}}}}}}}}}}}"
export const schema = EchoSchema.fromJson(schemaJson);

    export class Project extends EchoObjectBase {
      static readonly type = schema.getType('kai.example.tasks.Project');

      static filter(opts?: { title?: string,team?: OrderedSet<Contact>,tasks?: OrderedSet<Task> }): TypeFilter<Project> {
        return Project.type.createFilter(opts);
      }

      constructor(opts?: { title?: string,team?: OrderedSet<Contact>,tasks?: OrderedSet<Task> }) {
        super({ ...opts, '@type': Project.type.name }, Project.type);
      }
    
      declare title: string;
declare team: OrderedSet<Contact>;
declare tasks: OrderedSet<Task>;
    }
    schema.registerPrototype(Project);
  

    export class Task extends EchoObjectBase {
      static readonly type = schema.getType('kai.example.tasks.Task');

      static filter(opts?: { title?: string,count?: number,completed?: boolean,assignee?: Contact }): TypeFilter<Task> {
        return Task.type.createFilter(opts);
      }

      constructor(opts?: { title?: string,count?: number,completed?: boolean,assignee?: Contact }) {
        super({ ...opts, '@type': Task.type.name }, Task.type);
      }
    
      declare title: string;
declare count: number;
declare completed: boolean;
declare assignee: Contact;
    }
    schema.registerPrototype(Task);
  

    export class Contact extends EchoObjectBase {
      static readonly type = schema.getType('kai.example.tasks.Contact');

      static filter(opts?: { name?: string,username?: string,email?: string,address?: Address }): TypeFilter<Contact> {
        return Contact.type.createFilter(opts);
      }

      constructor(opts?: { name?: string,username?: string,email?: string,address?: Address }) {
        super({ ...opts, '@type': Contact.type.name }, Contact.type);
      }
    
      declare name: string;
declare username: string;
declare email: string;
declare address: Address;
    }
    schema.registerPrototype(Contact);
  
