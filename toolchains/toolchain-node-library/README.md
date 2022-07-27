# Toolchain orchestrator

Extensible orchestrator for tooling passes and config generators that operate on a single package-level.

## Package configuration

- Per-package configuration is defined in a separate section in package.json file.
- This configuration can extend configs provided by other packages and reference passes provided by plugins.

Tasks define pipelines of commands to execute. The tasks are predefined in toolchain:

- build - all build commands: protobuf, tsc, bundle
- build:test - all build and check commands: linter, tests
- test - run tests
- lint - run linter

Example of the config in an individual package:

```json
{
  "name": "@dxos/echo-db",
  "version": "1.2.3",
  "scripts": {
    // Just aliases for commands in toolchain. We shouldn't 
    "build": "toolchain build",
    "build:test": "toolchain build:test",
    "test": "toolchain test",
    "lint": "toolchain lint",
  },
  "toolchain": {
    "extends": [
      // Includes default passes such as tsc, protobuf, linter...
      "@dxos/toolchain/defaults", 
    ],
    "config": {
      "entrypoint": "src/index.ts",
      "out": "dist/bundle.js"
    },
    "tasks": {
      "build": [
        // Can use + to add a pass, or - to remove a pass.
        // Existing passes can be referenced for ordering.
        "+@dxos/toolchain-esbuild"
      ],
      "test": [
        // A custom shell pass that will be executed before jest.
        "shell:echo 'Before test'",
        // Use jest instead of mocha.
        "-@dxos/toolchain/pass/mocha",
        "+@dxos/toolchain/pass/jest"
      ]
    }
  },
  "devDependencies": {
    "@dxos/toolchain": "1.2.3",
    "@dxos/toolchain-tsc-pass": "1.2.3"
  }
}
```

## Passes

The each pass exports functions to:

- Generate config files: used to generate repeated config files like tsconfig.json or .eslintrc.js.
Those configs should be put in .gitignore. And preferably hidden from project view in IDEs.
- Execute the pass: building package files, running the linter or running other checks.


Example of a pass definition:

```typescript
// In @dxos/toolchain-tsc

import { exec, Package } from '@dxos/toolchain'

export async function generateConfig(package: Package, config: any) {
  const mergedConfig = lodash.merge(config, {
    compilerOptions: {
      outDir: 'dist',
    },
    includes: [
      'src/**'
    ]
  })

  await package.writeJson('tsconfig.json', mergedConfig)
}

export async function run(package: Package, config: any, args: string[]) {
  await exec('tsc', args);
}
```

## CLI

```bash
# Execute a task
toolchain build

# Assuming lint only has a single job defined for the lint task the arguments will be passed as is.
toolchain lint --fix

# Regenerate config files build task only.
# Cleans all output files in the package before regenerating.
# Generation (without cleaning) is performed automatically before every task is executed.
toolchain --generate build

# Execute a specific job.
toolchain --job @dxos/toolchain-eslint
```

Toolchain can be installed globally so that toolchain commands can be executed without `yarn`, `npm`, `rushx`, or others.

## Package resolution

Resolving other packages referenced in config files should be done using `require.resolve` starting from the directory containing the config that referenced the package,

## Extensible config

Configs can be extended using the `"extends"` key.
It should contain an array of strings pointing to json or js files that when loaded will return the config.

## Generated configuration files

Tasks can generate configuration files in packages.
This is useful for config files such as `tsconfig.json` or `.eslintrc.js`.
They are often the same for every package but still must be present for tools to function correctly.

Generated configs should be placed in .gitignore and not be commited to the repository.
They could also be hidden from the project view in IDEs. Most IDEs have settings or plugins that hide files ignored from git.
Toolchain orchestrator can automatically generate per-package `.gitignore` files based on the configuration generated.

Configuration regeneration should be quick to execute.
We can run it automatically before executing a task (e.g. build, or test).
