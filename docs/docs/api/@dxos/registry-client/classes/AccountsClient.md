# Class `AccountsClient`
> Declared in [`packages/sdk/registry-client/src/api/accounts-client.ts`]()

Main API for DXNS account and devices management.

## Constructors
```ts
new AccountsClient (_backend: AccountsClientBackend) => AccountsClient
```

## Properties


## Functions
```ts
addDevice (account: AccountKey, device: string) => Promise<void>
```
Add a new device to an existing DXNS account.
```ts
belongsToAccount (account: AccountKey, device: string) => Promise<boolean>
```
Is the given device a listed device of this DXNS account?
```ts
createAccount () => Promise<AccountKey>
```
Creates a DXNS account on the blockchain.
```ts
getAccount (account: AccountKey) => Promise<undefined | Account>
```
Get the account details.
```ts
listAccounts () => Promise<Account[]>
```
List accounts in the system.