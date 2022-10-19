# Class `SchemaBuilder`
> Declared in [`packages/sdk/client-testing/src/builders/schemaBuilder.ts`]()



## Constructors
```ts
new SchemaBuilder (_database: Database) => SchemaBuilder
```

## Properties


## Functions
```ts
createData (customSchemas: SchemaDefWithGenerator[], options: object) => Promise<Item<Model<any, any>>[][]>
```
Create data for all schemas.
```ts
createItems (__namedParameters: SchemaDefWithGenerator, numItems: number) => Promise<Item<Model<any, any>>[]>
```
Create items for a given schema.
NOTE: Assumes that referenced items have already been constructed.
```ts
createSchemas (customSchemas: SchemaDefWithGenerator[]) => Promise<Schema[]>
```