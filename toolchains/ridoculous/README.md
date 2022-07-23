# Ridoculous

Has the same [meaning](https://www.urbandictionary.com/define.php?term=ridoculous) as ridiculous only cooler people say this word.

## Remark

Ridoculous uses the following technologies to parse and update Markdown documents.

- [Remark](https://github.com/remarkjs/remark) - Mardown parser built on unified.
- [unified](https://github.com/unifiedjs/unified) - AST parser.
- [mdast](https://github.com/syntax-tree/mdast) - Markdown AST.
- [Rehype](https://github.com/rehypejs/rehype) - Transforms AST to HTML.


## ESM

TODO: Update wiki: https://github.com/dxos/eng/wiki/Build-System-~-Troubleshooting#nodejs-and-esm

This package uses ESM, which is configured via:
- `package.json` file defines `"type": "module"`.
- `tsconfig.json` defines `"module": "ESNext"`.
- `.eslintrc.cjs` has the `cjs` extension.
- `ts-node` must be invoked with the `--esm` flag.
- `import` statements must specify the `.js` file extension.
  - https://github.com/microsoft/TypeScript/issues/40878 (Flame war).
- Troubleshooting: problems if IDE or `tsc` misconfiguration generates `.js` files in the `src` folder.
