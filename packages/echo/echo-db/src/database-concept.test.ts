import { schema } from './proto/gen'
import * as pb from 'protobufjs'
import { createId } from '@dxos/crypto'
import assert from 'assert'

type ItemId = string

const kData = Symbol('Data')
const kDatabase = Symbol('Database')
const kType = Symbol('Type')

interface Mutation {
  itemId: ItemId,
  property?: string,
  type: 'set' | 'array-push' | 'create-item'
  value?: any
  itemType?: string
}

class Database {
  mutationLog: Mutation[] = []

  import(item: Item) {
    assert(!item[kDatabase], 'Item already imported')

    this.addMutation({ itemId: item.$id, type: 'create-item', itemType: item.$type })
    for(const field of item[kType].fieldsArray) {
      if(field.repeated) {
        for(const element of item[kData][field.name] ?? []) {
          if(element instanceof Item) { 
            this.import(element)
            this.addMutation({ itemId: item.$id, type: 'array-push', property: field.name, value: element.$id })
          } else {
            this.addMutation({ itemId: item.$id, type: 'array-push', property: field.name, value: element })
          }
        }
      } else {
        if(item[kData][field.name]) {
          if(item[kData][field.name] instanceof Item) { 
            this.import(item[kData][field.name])
            this.addMutation({ itemId: item.$id, type: 'set', property: field.name, value: item[kData][field.name].$id })
          } else {
            this.addMutation({ itemId: item.$id, type: 'set', property: field.name, value: item[kData][field.name] })
          }
        }
      }
    }

    item[kDatabase] = this;
  }

  addMutation(mutation: Mutation) {
    this.mutationLog.push(mutation)
  }
}

class Item {
  $id!: ItemId
  $type!: string;

  [kData]: any
  [kDatabase]!: Database
  [kType]!: pb.Type
}

type Constructor<T> = { new (): T }

function createDatabase<T extends Item>(rootItem: T): T {
  const database = new Database()
  database.import(rootItem);
  return rootItem;
}

function getProperty(item: Item, key: string, getDefault: () => unknown): unknown {
  return (item[kData] ??= {})[key] ??= getDefault();
}

function setProperty(item: Item, key: string, value: unknown) {
  (item[kData] ??= {})[key] = value;
  if(item[kDatabase]) {
    item[kDatabase].addMutation({ itemId: item.$id, type: 'set', property: key, value })
  }
}

function createItemPrototype<T>(type: pb.Type): Constructor<Item & T>  {
  const proto = class extends Item {
    constructor() {
      super()

      this.$id = createId()
      this[kData] = {}
    }
  } as Constructor<Item & T>

  Object.defineProperty(proto.prototype, '$type', {
    get() {
      return type.fullName
    },
  })
  Object.defineProperty(proto.prototype, kType, {
    get() {
      return type
    },
  })

  for(const field of type.fieldsArray) {
    const name = field.name
    
    if(field.repeated) {
      Object.defineProperty(proto.prototype, name, {
        get() {
          return getProperty(this, name, () => new EchoArray(this, name))
        },
      })
    } else {
      Object.defineProperty(proto.prototype, name, {
        get() {
          return getProperty(this, name, () => undefined)
        },
        set(value) {
          setProperty(this, name, value)
        },
      })
    }
  }
  return proto
}

class EchoArray extends Array {
  constructor(
    private readonly _item: Item,
    private readonly _property: string,
  ) {
    super();
  }

  override push(...items: any) {
    if(this._item[kDatabase]) {
      for(const item of items) {
        this._item[kDatabase].import(item)
        this._item[kDatabase].addMutation({ itemId: item.$id, property: this._property, type: 'array-push', value: item instanceof Item ? item.$id : item })
      }
    }

    return super.push(...items)
  }
}

// Imagine this is generated
namespace gen {
  export class MyDatabase extends createItemPrototype(schema.getCodecForType('dxos.test.newdb.MyDatabase').protoType) {
    title!: string
    organizations!: Organization[];
    people!: Person[];
    owner?: Person;
  }

  export class Organization extends createItemPrototype(schema.getCodecForType('dxos.test.newdb.Organization').protoType) {
    name!: string;
    description!: string;
  }

  export class Project extends createItemPrototype(schema.getCodecForType('dxos.test.newdb.Project').protoType) {
    name!: string;
    description!: string;

    assignees!: Person[];
  }


  export class Person extends createItemPrototype(schema.getCodecForType('dxos.test.newdb.Person').protoType) {
    firstName!: string;
    lastName!: string;
  }
}

describe.only('New database concept', () => {
  it('demo', () => {
    const database = createDatabase(new gen.MyDatabase());

    database.title = 'My database';

    {
      const person = new gen.Person()
      person.firstName = 'Alan'
      person.lastName = 'Turing'
      database.people.push(person)
    }

    console.log(database[kDatabase].mutationLog)
  })
})