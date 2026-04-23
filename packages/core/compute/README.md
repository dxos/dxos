# @dxos/compute

Umbrella package for AI-aware DXOS compute primitives.

## Submodules

Stage 1: the submodules below re-export primitives from their existing home
packages so that consumers can depend on a single surface (`@dxos/compute`).

| Submodule                                 | Source                    |
| ----------------------------------------- | ------------------------- |
| `@dxos/compute/Operation`                 | `@dxos/operation`         |
| `@dxos/compute/Blueprint`                 | `@dxos/blueprints`        |
| `@dxos/compute/Prompt`                    | `@dxos/blueprints`        |
| `@dxos/compute/Template`                  | `@dxos/blueprints`        |
| `@dxos/compute/Trigger`                   | `@dxos/functions`         |
| `@dxos/compute/Script`                    | `@dxos/functions`         |
| `@dxos/compute/Process`                   | `@dxos/functions`         |
| `@dxos/compute/Trace`                     | `@dxos/functions/Trace`   |
| `@dxos/compute/ServiceResolver`           | `@dxos/functions`         |
| `@dxos/compute/StorageService`            | `@dxos/functions`         |

The top-level entry point (`@dxos/compute`) still exposes the low-level
compute-graph / HyperFormula API used by `plugin-sheet`; this is unchanged.

## Roadmap

- Stage 2: migrate source into `@dxos/compute` and remove the intermediate
  `@dxos/operation`, `@dxos/blueprints`, and `@dxos/functions` packages.
- A companion `@dxos/compute-runtime-local` package will host the local
  implementations of the services defined here (currently in
  `@dxos/functions-runtime`).
