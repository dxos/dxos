---
description: When user wants to rename deps accross monorepo
auto_execution_mode: 3
---

You only use the ./scripts/rename.mjs script.

/\*\*

- Symbol Renaming Script
-
- This script renames TypeScript import symbols across the entire monorepo.
- It updates both the imported symbol name and its package source, creating
- separate import statements when necessary.
-
- Usage:
- ./scripts/rename.mjs --rename=oldPackage#oldSymbol:newPackage#newSymbol
-
- Multiple renames can be specified:
- ./scripts/rename.mjs \
-     --rename=pkg-a#foo:pkg-b#bar \
-     --rename=pkg-x#old:pkg-y#new
-
- Examples:
-
- 1.  Basic symbol rename:
- Input: import { foo } from 'pkg-a';
- Command: ./scripts/rename.mjs --rename=pkg-a#foo:pkg-b#bar
- Output: import { bar } from 'pkg-b';
-
- 2.  Preserving other imports:
- Input: import { foo, other } from 'pkg-a';
- Command: ./scripts/rename.mjs --rename=pkg-a#foo:pkg-b#bar
- Output: import { other } from 'pkg-a';
-            import { bar } from 'pkg-b';
-
- Features:
- - Processes all .ts and .tsx files in the monorepo
- - Respects .gitignore
- - Preserves other imports in the same import statement
- - Only modifies files that contain the exact symbol to be renamed
- - Creates separate import statements for renamed symbols
    \*/


NOTE: Script is bugged, so only one rename at a time is supported.

You can infer what to rename from compiler errors.