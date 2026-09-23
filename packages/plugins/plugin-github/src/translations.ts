//
// Copyright 2026 DXOS.org
//

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
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
        'ci-status.success': 'CI passing',
        'ci-status.failure': 'CI failing',
        'ci-status.pending': 'CI running',
        'ci-status.none': 'No CI',
        'ci-status.unknown': 'CI unknown',
      },
    },
  },
];
