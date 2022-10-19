# Class `ApiTransactionHandler`
> Declared in [`packages/sdk/registry-client/src/polkadot/api-transaction-handler.ts`]()

TODO(burdon): Comment.

## Constructors
```ts
new ApiTransactionHandler (api: ApiPromise, _signFn: SignTxFunction | AddressOrPair) => ApiTransactionHandler
```

## Properties


## Functions
```ts
ensureExtrinsicNotFailed (events: EventRecord[]) => void
```
```ts
getErrorName (rejectionEvent: Event) => string
```
```ts
sendSudoTransaction (transaction: Tx, sudoSignFn: SignTxFunction | AddressOrPair) => Promise<SendTransactionResult>
```
```ts
sendTransaction (transaction: SubmittableExtrinsic<"promise", ISubmittableResult>, signFn: SignTxFunction) => Promise<SendTransactionResult>
```