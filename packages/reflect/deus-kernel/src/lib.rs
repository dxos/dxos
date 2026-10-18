//
// Copyright 2026 DXOS.org
//

//! The DEUS kernel: a CEK machine for Core images (see README.md).

pub mod host;
pub mod machine;
pub mod prims;
pub mod run;
#[cfg(not(target_arch = "wasm32"))]
pub mod server;
pub mod sexp;
pub mod text;
pub mod value;

#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
pub mod embed;
pub mod json;
