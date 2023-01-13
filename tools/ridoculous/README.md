# Ridoculous

Has the same [meaning](https://www.urbandictionary.com/define.php?term=ridoculous) as ridiculous only cooler people say this word.

## ESM

This package uses ESM with minimal `tsc` and `mocha` configurations.
NOTE: This is non-standard for the @dxos monorepo and some libs (e.g., @dxos/log) might not work.

ESM modules have the following configuration and require file extensions for imports.

```
// package.json
"type": "module"

// tsconfig.json
"module": "ESNext"
```

## Remark

Ridoculous uses the following technologies to parse and update Markdown documents.

- [Remark](https://github.com/remarkjs/remark) - Mardown parser built on unified.
- [unified](https://github.com/unifiedjs/unified) - AST parser.
- [mdast](https://github.com/syntax-tree/mdast) - Markdown AST.
- [Rehype](https://github.com/rehypejs/rehype) - Transforms AST to HTML.
