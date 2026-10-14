//
// Copyright 2026 DXOS.org
//

//! Recomputes every shipped rule file against an existing store and prints per-file timings:
//! `cargo run --release --example reason_all -- <store>/native <rules dir> [--incremental]`.

use code_index_native::store::{NativeStore, Stratum};

fn main() {
    let mut args = std::env::args().skip(1);
    let (dir, rules) = (
        args.next().expect("store dir"),
        args.next().expect("rules dir"),
    );
    let incremental = args.next().as_deref() == Some("--incremental");
    let mut names: Vec<String> = std::fs::read_dir(&rules)
        .expect("rules dir")
        .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
        .filter(|name| name.ends_with(".n3"))
        .collect();
    names.sort();
    let strata: Vec<Stratum> = names
        .iter()
        .map(|name| Stratum {
            graph: format!(
                "https://dxos.org/deus/graph/derived/{}",
                name.trim_end_matches(".n3")
            ),
            rules: std::fs::read_to_string(format!("{rules}/{name}")).expect("rules"),
        })
        .collect();
    let store = NativeStore::open(&dir).expect("open");
    if !incremental {
        store.invalidate().expect("invalidate");
    }
    for outcome in store.reason_all(&strata).expect("reason") {
        println!(
            "{:<60} {:>8.1}ms derived={} +{} -{} incremental={}",
            outcome.graph,
            outcome.duration_ms,
            outcome.derived,
            outcome.added,
            outcome.removed,
            outcome.incremental
        );
    }
}
