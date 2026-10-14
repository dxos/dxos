//
// Copyright 2026 DXOS.org
//

//! `deus-kernel [args…]`: runs a DEUS image (by default the toolchain's seed) with the arguments.

mod host;
mod machine;
mod prims;
mod run;
mod sexp;
mod text;
mod value;

use machine::Options;

/// The seed this build was made next to; `DEUS_SEED` overrides it.
const SEED_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../deus-lang/seed/deus.image");

fn options() -> Options {
    let flag = |name: &str| {
        std::env::var(name)
            .map(|value| !value.is_empty())
            .unwrap_or(false)
    };
    Options {
        trace: flag("DEUS_TRACE"),
        profile: flag("DEUS_PROFILE"),
        max_steps: std::env::var("DEUS_MAX_STEPS")
            .ok()
            .and_then(|value| value.parse().ok()),
    }
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let image = match run::embedded_image() {
        Some(image) => image,
        None => {
            let path = std::env::var("DEUS_SEED").unwrap_or_else(|_| SEED_PATH.to_string());
            match std::fs::read(&path) {
                Ok(bytes) => String::from_utf8_lossy(&bytes).into_owned(),
                Err(err) => {
                    eprintln!("deus-kernel: cannot read image {path}: {err}");
                    std::process::exit(2);
                }
            }
        }
    };
    let host = Box::new(host::SystemHost::new(args));
    std::process::exit(run::run_image(&image, host, &options()));
}
