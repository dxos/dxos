<prompt>How should I structure a CLI tool with subcommands?</prompt>

<reasoning>
The user is asking about CLI subcommand structure. Let me think through what they likely care about:

1. Discoverability — every subcommand needs help text and a flat top-level listing.
2. Composability — subcommands should be invokable individually for scripting.
3. Shared concerns — auth, config, logging should not be duplicated per command.

A few patterns worth considering:

- A single binary that dispatches to subcommand handlers (like `git`, `kubectl`).
- A plugin model where subcommands live in separate binaries on the PATH (like `git-foo`).
- A library that each subcommand wraps as a thin executable.

The plugin model wins for very large surfaces but adds packaging cost. For a tool with under ~30 subcommands the dispatcher pattern stays clearer.
</reasoning>

For a CLI with a moderate set of subcommands, the dispatcher pattern is usually the right default:

1. One binary, one entry point.
2. Subcommands registered as handlers off a shared root.
3. Cross-cutting concerns (auth, config, logging) wired in at the root and inherited.

If you grow past ~30 subcommands or want third-party extensions, switch to a plugin model where binaries named `<tool>-<subcommand>` are discovered on the `PATH`.
