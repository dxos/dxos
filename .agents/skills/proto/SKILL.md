---
name: proto
description: proto, the version manager that pins this repo's toolchain in .prototools (node, pnpm, bun, moon, rust). Use when a tool version is wrong or missing, when bumping a pinned version, when PATH lacks the proto shims, or when configuring .prototools.
---

# proto in this repo

proto pins and installs every toolchain version this repo uses. **`.prototools`
at the repo root is the source of truth** — it currently pins `proto`, `node`,
`pnpm`, `bun`, `moon`, and `rust`, with `auto-install = true` so the right
versions install on first use.

## The one rule that matters: bumping a version is a sweep

Some pins are unavoidably duplicated outside `.prototools` (container images
built before proto exists, GitHub Action inputs, npm manifests — e.g. the root
npm packages carry moon so Cloudflare Pages deploys work). Divergence is silent:
the copy typically wins early in a CI job and the pin wins once moon's toolchain
cache exists, so a mismatch first bites on a cold cache, long after the commit
that introduced it. After changing any version in `.prototools`:

```bash
git grep -n '<old version>' -- ':!pnpm-lock.yaml'
```

and update every hit. The header comment in `.prototools` documents this
contract — keep it intact.

## PATH and shims

Tools are invoked through proto's shims. If `moon`/`node`/`pnpm` resolve to a
system version (or not at all):

```bash
export PATH="$HOME/.proto/shims:$HOME/.proto/bin:$PATH"
```

This matters in fresh shells and sandboxes — the repo pins node 24.x while
system node is often older, and `pnpm install` under the wrong node produces
confusing failures. In the Claude Code cloud sandbox, see the `cloud-sandbox`
skill first.

Install proto itself on a new machine:

```bash
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)
```

## Everyday commands

```bash
proto install                  # install everything .prototools pins
proto install node 24.11.1     # install one specific version
proto pin <tool> <version>     # update the pin (then do the sweep above)
proto outdated                 # check for updates
proto debug config             # list all .prototools files in effect
proto debug env                # show environment info
proto diagnose                 # identify installation issues
```

## Version detection order

1. CLI argument: `proto run node 18.0.0`
2. Environment variable: `PROTO_NODE_VERSION=...`
3. Local `.prototools` (current + parent dirs) — the normal case here
4. Ecosystem files: `.nvmrc`, `package.json` engines
5. Global `~/.proto/.prototools`

## Environment variables

| Variable          | Description                                  |
| ----------------- | -------------------------------------------- |
| `PROTO_HOME`      | Installation directory (default: `~/.proto`) |
| `PROTO_LOG`       | Log level (trace, debug, info, warn, error)  |
| `PROTO_*_VERSION` | Override version for a tool                  |

## Reference (generic proto docs)

- **`references/config.md`** — complete .prototools reference
- **`references/commands.md`** — full CLI reference
- **`examples/`** — sample configurations
