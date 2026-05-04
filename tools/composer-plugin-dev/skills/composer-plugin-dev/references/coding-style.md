# Coding style

These rules keep plugins consistent and avoid recurring review nits.

- Use `invariant(cond, msg)` for preconditions instead of throwing.
- Use barrel imports — `#capabilities`, `#components`, `#containers`, `#meta`, `#operations`, `#types` — never deep relative paths.
- **No default exports**, except per-container `index.ts` files (so `React.lazy` can import them).
- Container-to-container imports use the default form: `import OtherContainer from '../OtherContainer';`.
- Prefer ES `#private` fields/methods over TypeScript `private`. Existing `_private` is fine to keep.
- Use `Panel.Root` with a `role` prop on every article/section container.
- All ECHO interfaces must be reactive (`useQuery`, `useObject`, atoms). Don't memoize ECHO objects across renders.
- Avoid casting to silence the type checker — refactor instead, or ask before casting.
- Single quotes for strings; arrow components; named exports for components.
- TODOs are fine but must be removed/updated as you go.
- Avoid single-letter variable names.
- Imports order: builtin → external → `@dxos` → internal → parent → sibling, with blank lines between groups.

## React specifics

- Import named symbols from React (`useMemo`, `type Ref`) — not `React.useMemo` / `React.Ref`.
- When using `forwardRef`, name the param `forwardedRef`.

## Comments

- Default to **no comments**.
- Add a comment when the _why_ is non-obvious — a hidden constraint, a workaround, a subtle invariant.
- All JSDoc/code comments end with a period.

## General rules

- `src/components/` and `src/containers/` contain only barrels and per-component subdirectories.
- `src/index.ts` is minimal — only the plugin and meta.
- Other plugins should import deep paths (`./types`, `./operations`), never the top barrel for everything.
