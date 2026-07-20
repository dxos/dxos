---
'@dxos/compute-runtime': minor
---

Remove the deprecated local/remote function-execution machinery:
`FunctionInvocationService`, `LocalFunctionExecutionService`,
`FunctionImplementationResolver`, `ServiceContainer`, and `FunctionExecutor`.
Operation invocation now runs exclusively through `Operation.Service`
(`ProcessOperationInvoker`); select edge dispatch per invocation with
`{ on: 'edge' }`, keyed by the operation's `deployedId`.
