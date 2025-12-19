# DX CLI

## Development

To temporarily install the cli run `pnpm link` from the CLI directory:

```bash
pnpm link --global
```

To undo:

```bash
pnpm unlink --global @dxos/cli
```

## Setup

- Ensure you have a `main` profile for EDGE: `dx profile list`.
- If not create one: `dx profile create --template main`.
- Set the profile environment variable: `export DX_PROFILE="main"`.
- Link the dx CLI's HALO to a Composer's identity:
    - Navigate to Profile > Security > Create Recovery Code
    - Enter the recovery code: `dx halo recover "<recovery code>"`

## Examples

### Chess

TODO(burdon): First add chess player funciton then commentary.

1.  Monitor function invocations: `dx function trace`.
2.  Import the chess commentary function: `dx function import "dxos.org/function/chess/commentary"`.
3.  Get the function id via: `dx function list` then create a subsription trigger:

```bash
dx trigger create subscription --enabled 
  --function-id <uuid> \n
  --typename "dxos.org/type/Chess" \n 
  --input "game={{event.subject}}"
```

4.  Sync the trigger to EDGE: `dx space sync --space-id <default-space-id>`
5.  In Composer, enable the chess plugin and create a chess game.
6.  Make a move and it should create a document with commentary about the move.
7.  Make another move and it should update the document.

### Inbox

1.  In Composer, enable the Inbox plugin and create a new mailbox.
2.  If you've not already authed with Google, there will be a `Manage Integrations` button in empty mailbox, click it and then do the Google auth process.
3.  Go back to the mailbox and open the Details companion.
4.  Press the `Configure Sync` button to create a trigger that references the mailbox's queue.
5.  In the navtree go to the space functions page.
6.  Once the remote functions load press the download button beside the `dxos.org/function/inbox/google-mail-sync` function to import it.
    - NOTE: be careful there are currently two gmail sync functions there but one is old and deprecated).
7.  Now open the automations page, select the trigger that was created earlier to edit it.
8.  Select the imported function and configure the timer.
    - Update the cron to `*/5 * * * *` (5 minutes), enable it and save it.
    - NOTE: there's a bug with the trigger editor where sometimes save doesn't close the form, but does save; close by pressing cancel.

## Current Limitations

- Use of Blueprint prompts within a function is not supported.
