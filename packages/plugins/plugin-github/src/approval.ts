//
// Copyright 2026 DXOS.org
//

import { GitHubApi } from './services/index.ts';

/**
 * Machine-readable marker carried by an approval posted as a comment.
 *
 * An HTML comment renders as nothing on GitHub, so the marker is invisible to a human reader while
 * remaining an exact string for an agent polling the conversation — which is the point: a comment
 * fallback has to be as detectable as the review state it stands in for.
 */
export const APPROVAL_MARKER = '<!-- dxos:approval state=approved -->';

/** Prose shown above the marker; states why the approval is a comment rather than a review. */
const APPROVAL_TEXT =
  'Approved — good to land.\n\n' +
  '_GitHub declined an approving review from this connection (a pull request cannot be approved by ' +
  'its own author, and some tokens carry no review permission), so the approval is recorded here._';

/** Body of the fallback comment: the reviewer's own summary, the standing text, and the marker. */
export const approvalCommentBody = (body?: string): string =>
  [body?.trim(), APPROVAL_TEXT, APPROVAL_MARKER].filter(Boolean).join('\n\n');

/** Whether a comment body records an approval — the detector an agent runs over a PR's comments. */
export const isApprovalComment = (body: string): boolean => body.includes(APPROVAL_MARKER);

/**
 * Whether an approving review failed for a reason a comment can stand in for.
 *
 * `422` is GitHub's answer to approving one's own pull request, `403` to a token without review
 * permission on the repository. Anything else (a rejected credential, a deleted pull request, a
 * network fault) is a real failure and must surface rather than turn into a comment.
 */
export const isApprovalRefused = (error: unknown): boolean => {
  const status = GitHubApi.responseStatus(error);
  return status === 403 || status === 422;
};
