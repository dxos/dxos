---
name: 1password
description: >-
  Get a credential (API key, token, password, certificate): first from a variable already
  exported in the shell, then from 1Password with the `op` CLI — only when
  `OP_SERVICE_ACCOUNT_TOKEN` is set (the cloud sandbox); in a local session never run
  `op`. Use whenever a task needs a secret — before asking the user for one, before asking them
  to create a `.secrets/` file, and before concluding a credential is unavailable. Use when a
  script or README names an `op://` reference or a `.env.tpl`.
---

# Credentials from 1Password

**Check the shell first.** If the variable the command reads is already exported, use it and stop
here; `op` is not needed. Test that it is exported, since an unexported shell variable never reaches
the command, and test in the shell itself, since a session's environment summary can miss variables
the shell profile sets. Read it only inside the test, so the value is never printed:

```bash
[ -n "$(printenv TYPESAFE_API_KEY)" ] && echo exported || echo unset   # substitute the variable's name
```

**Use `op` only when `OP_SERVICE_ACCOUNT_TOKEN` is set.** That token authenticates the CLI as a
service account, so it reads a secret straight into the command that needs it with no prompt and
nothing from the user. Without it, every `op` call — `op whoami` included — goes through the
desktop app's integration and pops an authorization dialog on the user's screen, so in a local
session do not run `op` at all, not even to probe.

## Is it available?

```bash
[ -n "${OP_SERVICE_ACCOUNT_TOKEN:-}" ] && command -v op && op whoami
```

Check the variable first and stop there if it is empty — the `op whoami` after it is only safe
because the token is present.

- **Cloud sandbox:** `.config/claude-code-setup.sh` installs `op`, and the environment provides
  `OP_SERVICE_ACCOUNT_TOKEN`. The service account sees only the vaults it was granted,
  currently **`CI`**. If `op` is missing because setup did not run, rerun the step labelled
  `# 2.` in that script.
- **Local session (no token):** skip `op`. If the shell check above found nothing, use
  the `.secrets/` flow (`AGENTS.md` → "Handing an agent a credential"). If the user
  keeps the value in 1Password, name the `op://` reference and let them run `op` themselves.
- **Token set but the item is unreachable:** say so once, then use the `.secrets/` flow.

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
