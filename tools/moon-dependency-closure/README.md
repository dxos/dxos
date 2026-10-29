# moon-dependency-closure

A moon toolchain plugin that keys every JavaScript task on its project's dependency closure, in place of
the whole `pnpm-lock.yaml`: every third-party package the project can load, through its own
dependencies, its workspace links, and the toolchain projects (the workspace root and the Storybook
configs), each with what it resolves its own dependencies to. A lockfile change then reruns only the
projects whose closure it changes. `src/closure.rs` computes the closure; `src/plugin.rs` is the moon side.

moon loads the committed `dependency-closure.wasm` from `.moon/toolchains.yml` and attaches it to every
task that uses the `javascript`, `node` or `typescript` toolchain.

## Changing the plugin

Nothing rebuilds the `.wasm` for you, and CI does not check it against the sources. After changing the
crate, rebuild it and commit it with the change:

```bash
moon run moon-dependency-closure:build-native
```

This needs Rust; `rust-toolchain.toml` pins the version and the `wasm32-wasip1` target, which rustup
installs on first use. `moon run moon-dependency-closure:test-native` runs the closure's tests, which
Check's `native` job also runs.

## Debugging a cache miss

`moon run <target> --log debug` prints the exact text the plugin hashes for each project it sees. Diffing
that output between two checkouts shows which packages re-keyed a task.
