# NX Toolbox

## Update all project to use toolbox.

The script patches all `package.json` files with the `@dxos/toolbox` executor.

```bash
pnpm run update
```

## Usage

Examples:

```bash
pnpm nx run-many --parallel=1 --target=toolbox --args=fix
pnpm nx run-many --target=toolbox --args=info --projects=async,util --verbose
```

> TODO(burdon): Bug currently requires `--parallel=1`; 
>   possible contention with executor reading `project.json` concurrently.
