## Why vendor depenencies

- They might use obsolete standards, e.g. CJS.
- They might not work out-of-the box with existing tools.
- We might want to patch or stub out some of their functionality.

## How does vendoring work

- We create a package `@dxos/vendor-<name>` that ships one or more vendored dependencies.
- When shipping multiple related deps at once use `@dxos/vender-<group name>/<package name>` export pattern.
- Shipping multiple deps at once allows them to re-use shared code.
- The most common way is to pre-bundle the dependencies using `esbuild`.
- We will ship the bundled code to NPM.
- We typically do not need to compile TypeScript since there's no actual code in the vendored dependencies -- just glue.
- Hand-writing `.d.ts` files is okay.
- Heavy use of package.json "exports" and "imports".
- The vendored packages should be in ESM format.
- The bundled-in deps should be in "devDependencies" section, while deps required at runtime should be in "dependencies" section.
- Use `vendor` moon tag when applicable.
- Disable ESLint.
