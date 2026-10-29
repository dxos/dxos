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

/** A spec review breaks the review rules. */
export class ReviewCheckError extends BaseError.extend('DeusReviewCheckError', 'The spec review has errors.') {}

/** One or more `.mdl` files have lint errors. */
export class LintError extends BaseError.extend('DeusLintError', 'The .mdl files have lint errors.') {}

/** The feature map has errors: a bad status, a spec reference that resolves to nothing, or a dependency cycle. */
export class FeatureCheckError extends BaseError.extend('DeusFeatureCheckError', 'The feature map has errors.') {}
