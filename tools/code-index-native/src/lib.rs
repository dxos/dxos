//
// Copyright 2026 DXOS.org
//

//! The native backend of code-index: an oxigraph quad store and an incremental N3 rule engine in
//! one library, so rules run against the store's indexes instead of a serialised copy of it.

pub mod eval;
pub mod facts;
pub mod rules;
mod snapshot;
pub mod store;

#[cfg(feature = "napi")]
mod binding;
