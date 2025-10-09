# Writing DXOS Functions
- use `defineFunction` from `@dxos/functions` to define new functions
- the function should be exported as default from the module
- prefer writing function handlers as `Effect.fn`s
- use `Effect.gen` instead if layers need to be provided
- use `DatabaseService` to interact with the current space
- use `QueueService` to get queues from the current space
- use `CredentialsService` to get api keys for services
- to convert DXN strings to DXNs use `DXN.parse`
