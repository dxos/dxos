//
// Copyright 2026 DXOS.org
//

/**
 * Whether code samples compile with twoslash. It recompiles every sample on each dev request, so dev leaves it off
 * and the build turns it on; `DOCS_TWOSLASH=1` or `DOCS_TWOSLASH=0` overrides either.
 */
export const twoslash = process.env.DOCS_TWOSLASH
  ? !['0', 'false'].includes(process.env.DOCS_TWOSLASH)
  : !process.argv.includes('dev');
