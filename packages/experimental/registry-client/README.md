# Registry API client

This package provides a utility operations and structures that connect with DXOS Registry service.
More information about the Registry can be found here: `https://github.com/dxos/dxns`.

## Build

`rushx build`

## Test

In order to run integration tests you need to first run an instance of the Registry node at `ws://127.0.0.1:9944`.

## Regenerate definitions

1. Run a local [node](https://github.com/dxos/dot).
2. If needed, supplement custom types in `./src/interfaces/registry/definitions.ts`.
3. Run `rushx generate:types`.

## Types

Various DXNS types are presented in a form of `protobuf` definitions for different entities which could be registered in DXNS. 
(in `packages/sdk/registry-client/src/proto/dxns/type.proto`) Each type definition could be extended with another defined type 
in order to narrow down information about the subject, e.g. `type.service.ipfs` is an extension for `type.service`. 
Thus, extension field's of `type.service` payload depends on service type and has extra data specific to that service.

Once DXNS network gets created, types are registered in DXNS under `dxos` authority. Registration process also includes publishing of `proto` definitions to IPFS. 
All actions mentioned above happen as a result of `dx ns seed` cli command defined here: `https://github.com/dxos/cli/blob/main/packages/cli-dxns/src/handlers/seed.ts`

While reading/writing data records from/to DXNS, `typeCid` should be provided. 
Thus, data record gets encoded/decoded correspondingly to a specific type definition.

## Useful information interacting with the Registry

DXOS Registry is [Substrate](https://substrate.dev/) based blockchain service.

### Transactions

Treat all operations as async where a response from the blockchain node does not
guarante the data sent is to be persisted forever (block finalization).

Read more about the [transaction statutes](https://substrate.dev/rustdocs/latest/sp_transaction_pool/enum.TransactionStatus.html).

We still lack an effective mechanism of ensuring data is finalized in the blockchain, 
see [this known issue](https://github.com/dxos/dot/issues/167).
