---
name: 1password
description: >-
  Get a credential (API key, token, password, certificate) from 1Password with the `op` CLI.
  Use whenever a task needs a secret — before asking the user for one, before asking them to
  create a `.secrets/` file, and before concluding a credential is unavailable. Use when
  `OP_SERVICE_ACCOUNT_TOKEN` is set, when `op` is installed, or when a script or README names an
  `op://` reference or a `.env.tpl`.
---

# Credentials from 1Password

**If `op` works, use it first.** The CLI reads a secret directly into the command that needs
it, so the value never passes through chat or the transcript. It also needs nothing from the
user, and the user's time is the scarcest thing in a session. Fall back to a `.secrets/` file
(`AGENTS.md` → "Handing an agent a credential") only when `op` cannot reach the item.

## Is it available?

```bash
command -v op && op whoami && op vault list
```

- **Cloud sandbox:** `.config/claude-code-setup.sh` installs `op`, and the environment provides
  `OP_SERVICE_ACCOUNT_TOKEN`, which authenticates it with no sign-in. The service account
  sees only the vaults it was granted, currently **`CI`**. If `op` is missing because setup
  did not run, rerun the step labelled `# 2.` in that script.
- **Local machine:** `op` is normally signed in through the desktop app's integration. If
  `op whoami` fails, ask the user to unlock 1Password. An agent cannot complete that sign-in.
- **Not available:** say so once, then use the `.secrets/` flow.

## Find the item

Search by title only. `op item list` never prints secret values:

```bash
op item list --vault CI --format json | python3 -c "import sys,json
for i in json.load(sys.stdin): print(i['category'], '|', i['title'])"
op item get '<title>' --vault CI --format json |
  python3 -c "import sys,json; print([f['label'] for f in json.load(sys.stdin)['fields']])"
```

A service account must pass `--vault` to every item command. Without it you get
`a vault query must be provided`. An `API_CREDENTIAL` item keeps its secret in the
`credential` field, and a `LOGIN` item keeps it in `password`.

## Use it without exposing it

Choose the narrowest form that works:

| Need                          | Command                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| Env vars for one command      | `FOO='op://CI/<item>/credential' op run -- <cmd>`               |
| A whole `.env` of references  | `op run --env-file=.env.tpl -- <cmd>`                           |
| Render a template to a file   | `op inject -i .env.tpl -o .env` (the output must be gitignored) |
| One value in a shell variable | `X="$(op read -n 'op://CI/<item>/credential')"`                 |

- `op run` replaces any secret it sees in the child's stdout/stderr with
  `<concealed by 1Password>`. That makes it the safest form, and the only one that protects a
  command that might log the value.
- `op read` prints the raw value, so always capture it in a variable or pipe it onward, never
  let it print to the terminal. Pass `-n`, or the value ends in a newline and a token that is
  one byte too long fails authentication.
- Never echo, `cat`, or log a value, and never put one in a commit, a PR, an issue, or chat.
  To check that a value arrived, print its length (`${#X}`), not its contents.
- Never write a value into a tracked file. Commit `op://` references (for example in a
  `.env.tpl`), not values.

## When the item is not there

A credential missing from every vault the account can see is a real blocker. Tell the user
which item you need and which vault it should be in, so they can add it or grant the service
account access. Do not look for it elsewhere on the machine.
