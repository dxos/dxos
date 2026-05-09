# @dxos/compute-hyperformula

HyperFormula-based compute graph (spreadsheet) engine.

This package contains the low-level compute graph used by `plugin-sheet`:
`ComputeGraph`, `ComputeGraphRegistry`, `ComputeNode`, the async/edge function
plugins, A1-notation helpers, and HyperFormula type re-exports.

It was extracted from `@dxos/compute` so that the umbrella `@dxos/compute`
package can focus on AI compute primitives (Operation, Blueprint, Process,
…) without pulling in the HyperFormula runtime.
