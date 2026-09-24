//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { PullRequest } from '@dxos/types';

import { meta } from '#meta';
import { Walkthrough } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(PullRequest.PullRequest)]: {
        'typename.label': 'Pull request',
        'typename.label_zero': 'Pull requests',
        'typename.label_one': 'Pull request',
        'typename.label_other': 'Pull requests',
        'object-name.placeholder': 'New pull request',
        'rename-object.label': 'Rename pull request',
        'delete-object.label': 'Delete pull request',
        'object-deleted.label': 'Pull request deleted',
      },
      [Type.getTypename(Walkthrough.Walkthrough)]: {
        'typename.label': 'Walkthrough',
        'typename.label_zero': 'Walkthroughs',
        'typename.label_one': 'Walkthrough',
        'typename.label_other': 'Walkthroughs',
        'object-name.placeholder': 'New walkthrough',
        'rename-object.label': 'Rename walkthrough',
        'delete-object.label': 'Delete walkthrough',
        'object-deleted.label': 'Walkthrough deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'GitHub',
        'sync-now.label': 'Sync now',
        'sync-toast.success.label': 'Sync complete',
        'sync-toast.error.label': 'Sync failed',
        'open-walkthrough.label': 'Open walkthrough',
        'generate-walkthrough.label': 'Generate walkthrough',
        'regenerate-walkthrough.label': 'Regenerate walkthrough',
        'no-walkthrough.message': 'No walkthrough yet for this pull request.',
        'walkthrough-generating.message': 'Writing the walkthrough…',
        'import-pull-request.label': 'Import pull request',
        'import-pull-request-dialog.title': 'Import pull request',
        'import-pull-request-submit.label': 'Import',
        'import-pull-request-failed.title': 'Could not import the pull request',
        'import-pull-request-token-rejected.title': 'GitHub rejected your connection — reconnect GitHub and try again',
        'import-pull-request-not-connected.title':
          'Pull request not found — connect GitHub to import one from a private repository',
        'import-pull-request-inaccessible.title':
          'Pull request not found, or not accessible with your GitHub connection',
        'import-pull-request-no-space.title': 'Open a space to import a pull request into',
        'open-pull-request.label': 'Open pull request',
        'github-token-rejected.title': 'GitHub rejected your connection — reconnect GitHub and try again',
        'walkthrough-ready.title': 'Walkthrough ready',
        'walkthrough-failed.title': 'Walkthrough generation failed',
        'approve-pull-request.label': 'Approve',
        'approve-pull-request-success.title': 'Pull request approved',
        'approve-pull-request-commented.title': 'Approval posted as a comment',
        'approve-pull-request-error.title': 'Could not approve the pull request',
        'comment-pull-request.label': 'Comment',
        'comment-placeholder.label': 'Leave a comment on the pull request',
        'comment-line.label': 'Commenting on {{file}}:{{line}}',
        'comment-submit.label': 'Post comment',
        'comment-cancel.label': 'Cancel',
        'comment-success.title': 'Comment posted',
        'comment-error.title': 'Could not post the comment',
        'open-on-github.label': 'Open on GitHub',
        'copy-link.label': 'Copy link to pull request',
        'copy-link-success.title': 'Link copied',
        'copy-link-error.title': 'Could not copy the link',
        'ci-status.success.label': 'CI passing',
        'ci-status.failure.label': 'CI failing',
        'ci-status.pending.label': 'CI running',
        'ci-status.none.label': 'No CI',
        'ci-status.unknown.label': 'CI unknown',
        'views.label': 'Views',
        'overview-tab.label': 'Overview',
        'walkthrough-tab.label': 'Walkthrough',
        'no-description.message': 'No description provided.',
        'related.label': 'Related',
        'checks.label': 'Checks',
        'checks-summary.label': '{{passed}} passed · {{failed}} failed · {{pending}} running · {{skipped}} skipped',
        'checks-loading.message': 'Loading checks…',
        'no-checks.message': 'No checks ran on the head commit.',
        'check-outcome.success.label': 'Passed',
        'check-outcome.failure.label': 'Failed',
        'check-outcome.pending.label': 'Running',
        'check-outcome.skipped.label': 'Skipped',
        'check-outcome.neutral.label': 'Neutral',
        'preview-deployment.label': 'Composer preview',
        'claude-session.label': 'Claude Code session',
        'claude-generated.label': 'Generated with Claude Code',
        'artifact-video.label': 'Demo video',
        'artifact-image.label': 'Screenshot',
        'artifact-file.label': 'Artifact',
        'branches.label': 'Branches',
        'open-link.label': 'Open',
      },
    },
  },
] as const satisfies Resource[];
