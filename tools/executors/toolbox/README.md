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
pnpm nx run-many --parallel=1 --target=toolbox --args=info --projects=async,util --verbose
```
