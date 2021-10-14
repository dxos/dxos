# Registry API client

This package provides a utility operations and structures that connect with
DXOS Registry service.

More information about the Registry can be found here: https://github.com/dxos/dot

## Build

`rushx build`

## Test

In order to run integration tests you need to first run an instance of the Registry
node at `ws://127.0.0.1:9944`.

## Regenerate definitions

1. Run a local [node](https://github.com/dxos/dot).
2. If needed, supplement custom types in `./src/interfaces/registry/definitions.ts`
3. Run `rushx generate:types`

## Useful information interacting with the Registry

DXOS Registry is [Substrate](https://substrate.dev/) based blockchain service.

### Transactions

Treat all operations as async where a response from the blockchain node does not
guarante the data sent is to be persisted forever (block finalization).

Read more about the [transaction statutes](https://substrate.dev/rustdocs/latest/sp_transaction_pool/enum.TransactionStatus.html).

We still lack an effective mechanism of ensuring data is finalized in the blockchain, see [this known issue](https://github.com/dxos/dot/issues/167).