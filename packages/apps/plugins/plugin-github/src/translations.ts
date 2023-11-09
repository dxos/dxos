//
// Copyright 2023 DXOS.org
//

import { GITHUB_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [GITHUB_PLUGIN]: {
        'plugin name': 'GitHub',
        'markdown actions label': 'GitHub actions',
        'unbind to file in github label': 'Disconnect from GitHub',
        'bind to file in github label': 'Connect to issue or file in GitHub',
        'github pat label': 'GitHub personal access token',
        'github pat description':
          'Composer needs this in order to communicate with GitHub. <docsLink>GitHub’s documentation describes how to create a token.</docsLink> Composer only needs write access to issues, contents, and pull requests.',
        'github pat description href':
          'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
        'empty github pat message': 'Set a GitHub personal access token to continue',
        'set github pat label': 'Set GitHub token',
        'error github pat message':
          'There was a problem authenticating with GitHub using the personal access token provided',
        'error github markdown path message': 'This is not a valid path to a Markdown file or Issue in GitHub.',
        'paste url to file in github label': 'Paste the URL to the Issue or Markdown file in GitHub',
        'paste url to file in github description':
          'Navigate to the issue or file in GitHub, then copy the URL in your browser and paste it here.',
        'paste url to file in github placeholder': 'https://github.com/owner/repo/blob/main/path/to/README.md',
        'confirm export title': 'Export to GitHub',
        'export to github success message':
          '<resultStyle>Success!</resultStyle> Your changes are now live here: <prLink>{{linkText}}</prLink>',
        'github branch name label': 'Name of the branch to create',
        'github branch name placeholder': 'update-readme',
        'github commit message label': 'Commit message',
        'github commit message placeholder': 'Updated README.md',
        'save and close description': 'Save changes to GitHub and close the editor',
        'close embed description':
          'Close the editor without saving changes to GitHub. Your changes will still persist in Composer.',
        'resolver init document message': 'Syncing this document, one moment…',
        'comment stale title': 'No longer in-sync',
        'comment stale body':
          'The document in GitHub was updated in another session. To re-sync, please save your changes, reload the page, and choose to edit from GitHub again.',
        'open in github label': 'Open in GitHub',
        'stale rescue title': 'Set a personal access token',
        'stale rescue description':
          'Another user has recently updated this issue, so GitHub won’t accept your changes unless you set a personal access token (a PAT) here, or refresh the page.',
        'embedded options label': 'Options',
        'unset repo space label': 'Select a different space for this repository',
        'loading preview message': 'Loading preview…',
        'preview gfm label': 'Preview Markdown',
        'exit gfm preview label': 'Exit preview',
        'save and close label': 'Save & close',
        'export to github label': 'Export to GitHub',
        'import from github label': 'Import from GitHub',
        'resolver tree label': 'Choose a Space',
        'resolver tree description':
          'To collaborate on documents in this repository, choose the Space that will store and control access to the documents.',
        'resolver no spaces message': 'You aren’t in any spaces yet',
        'resolver create space label': 'Create a space for this repository',
        'bound members message_one': 'One member uses this space for this repository',
        'bound members message_other': '{{count}} members use this space for this repository',
        'select label': 'Select',
        'selected label': 'Selected',
        'open in composer label': 'Open in Composer',
        'confirm import title': 'Overwrite this document’s content?',
        'confirm import body':
          'Importing will overwrite this document’s content. If you’d rather import into a new document, first create a new document and then import into it.',
      },
    },
  },
];
