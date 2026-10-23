//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A git command failed or exited non-zero. */
export class GitError extends BaseError.extend('DeusGitError', 'A git command failed.') {}

/** One or more changed specs break the changelog rules. */
export class ChangelogCheckError extends BaseError.extend('DeusChangelogCheckError', 'Spec changelog check failed.') {}

/** A QA lint reported findings in the plugin specs. */
export class QaLintError extends BaseError.extend('DeusQaLintError', 'The QA lints reported findings.') {}

/** One or more `.mdl` files have lint errors. */
export class LintError extends BaseError.extend('DeusLintError', 'The .mdl files have lint errors.') {}
