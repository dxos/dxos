//! A moon toolchain plugin that adds a project's dependency closure (`closure.rs`) to the hash of every
//! task moon gives the `javascript` or `node` toolchain, in place of the whole `pnpm-lock.yaml`.

pub mod closure;

#[cfg(target_arch = "wasm32")]
mod plugin;
