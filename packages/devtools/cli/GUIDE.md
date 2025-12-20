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

1.  Monitor function invocations: `dx function trace`.
2.  Import the chess bot function: `dx function import "dxos.org/script/chess-bot"`.
3.  Import the chess commentary function: `dx function import "dxos.org/function/chess/commentary"`.
4.  Get the function id via: `dx function list` then create 2 subscription triggers for bot and commentary:

```bash
dx trigger create subscription --enabled 
  --function-id <uuid> \n
  --typename "dxos.org/type/Chess" \n 
  --input "game={{event.subject}}"
```

5.  Sync the trigger to EDGE: `dx space sync --space-id <default-space-id>`
6.  In Composer, enable the chess plugin and create a chess game.
7.  Make a move and it should create a document with commentary about the move.
8.  Make another move and it should update the document.

### Inbox

1. Get a Google auth token by running `dx integration add --preset google`.
2. Create a new mailbox by running `dx database add` and choosing `Mailbox` from the options.
3. Import the Gmail sync function by running `dx function import` and choosing the `Sync Gmail` function which has the key of `dxos.org/function/inbox/google-mail-sync`.
   - NOTE: be careful there are currently two gmail sync functions there but one is old and deprecated.
4. Create a trigger for the sync by running `dx trigger create timer`.
   - Choose the `Sync Gmail` function just imported.
   - Set the cron to `*/5 * * * *` (5 minutes)
   - Select yes to customizing the input and choose to include the restricted option.
   - Choose the mailbox created earlier as the mailbox and set restricted mode to true.
   - Enable the trigger.
5. Observe invocations of the function every 5 minutes with `dx function trace`.

#### Classify

1. Import the Classify function by running `dx function import` and choosing `Classify` function which has the key of `dxos.org/function/inbox/email-classify`.
   - NOTE: The classification depends on `Tag.Tag` objects in the database so be sure to create some tags before triggering it.
2. Create a trigger for the classifier by running `dx trigger create queue`.
   - Choose the `Classify` function just imported.
   - Choose the mailbox created earlier as the queue to trigger on.
   - Specify the message input with the template `{{event.item}}`.
   - Enable the trigger.
3. Observe invocation of the function after emails are sync'd with `dx function trace`.

## Current Limitations

- Use of Blueprint prompts within a function is not supported.
