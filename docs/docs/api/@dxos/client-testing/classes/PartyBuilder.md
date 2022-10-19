# Class `PartyBuilder`
> Declared in [`packages/sdk/client-testing/src/builders/partyBuilder.ts`]()

Party builder.

## Constructors
```ts
new PartyBuilder (_party: Party) => PartyBuilder
```

## Properties


## Functions
```ts
createLink (source: Item<ObjectModel>, target: Item<ObjectModel>) => Promise<void>
```
```ts
createOrg () => Promise<Item<ObjectModel>>
```
```ts
createOrgs (n: NumberRange, callback: function) => Promise<Item<ObjectModel>[]>
```
```ts
createParty () => Promise<void>
```
```ts
createPerson (org: Item<ObjectModel>) => Promise<Item<ObjectModel>>
```
```ts
createProject (org: Item<ObjectModel>) => Promise<Item<ObjectModel>>
```
```ts
createRandomItem (parent: Item<ObjectModel>) => Promise<void>
```
```ts
createTask (project: Item<ObjectModel>) => Promise<Item<ObjectModel>>
```