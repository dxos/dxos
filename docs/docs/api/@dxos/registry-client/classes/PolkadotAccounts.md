# Class `PolkadotAccounts`
> Declared in [`packages/sdk/registry-client/src/polkadot/accounts.ts`]()

Polkadot DXNS accounts client backend.

## Constructors
```ts
new PolkadotAccounts (api: ApiPromise, signFn: SignTxFunction | AddressOrPair) => PolkadotAccounts
```

## Properties
### `api: ApiPromise`
### `transactionsHandler: ApiTransactionHandler`

## Functions
```ts
addDevice (account: AccountKey, device: string) => Promise<void>
```
```ts
belongsToAccount (account: AccountKey, device: string) => Promise<boolean>
```
```ts
createAccount () => Promise<AccountKey>
```
```ts
getAccount (account: AccountKey) => Promise<undefined | Account>
```
```ts
listAccounts () => Promise<Account[]>
```