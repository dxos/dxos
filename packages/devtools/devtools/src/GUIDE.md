# DX CLI

```bash
alias dx="packages/devtools/cli-next/dxnext"

export DX_PROFILE="main"
```

## Setup

- `dxnext` is located in `packages/devtools/cli-next` in the dxos repo.
- Ensure you've got a cli profile configured for edge main by running `dx profile list` (because local composer defaults to edge main).
- If not create one with `dx profile create --template main`
- All commands should be run from this profile.
- Join your cli and composer in the same identity by creating a recovery code in composer and then running `dx halo recover "<recovery code>"`

## Triggers

- `dx function trace` will give you a view of the function invocations in the default space.

## Chess Commentary

1.  `dx function import "dxos.org/function/chess/commentary"`
2.  `dx function list` and grab the function uuid out of the object meta.
3.  `dx trigger create subscription --enabled --function-id <uuid> --typename "dxos.org/type/Chess" --input "game={{event.subject}}"`
4.  `dx space sync --space-id <default-space-id>`
5.  Create a chess game and you should see an invocation failure because there's no moves.
6.  Make a move and it should create a document with commentary about the move.
7.  Make another move and it should update the document.

## Email Sync

1.  In Composer, enable the Inbox plugin.
2.  Create a new mailbox.
3.  If you've not already authed with Google, there will be a `Manage Integrations` button in empty mailbox, click it and then do the Google auth process.
4.  Go back to the mailbox and open the Details companion.
5.  Press the `Configure Sync` button to create a trigger that references the mailbox's queue.
6.  In the navtree go to the space functions page.
7.  Once the remote functions load press the download button beside the `dxos.org/function/inbox/google-mail-sync` function to import it.
    - NOTE: be careful there are currently two gmail sync functions there but one is old and deprecated).
8.  Now open the automations page, select the trigger that was created earlier to edit it.
9.  Select the function just imported, set it to restricted mode, update the cron to `*/5 * * * *` (5 minutes), enable it and save it.
    - NOTE: there's a bug with the trigger editor where sometimes save doesn't close the form, but it actually did save and it can be closed by pressing cancel.

## Current Limitations

- Use of Blueprint prompts within a function is not supported.
