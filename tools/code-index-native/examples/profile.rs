//
// Copyright 2026 DXOS.org
//

//! Times each rule of one rule file, alone, against an existing store:
//! `cargo run --release --example profile -- <store>/native <rules.n3>`.

use std::time::Instant;

use code_index_native::store::NativeStore;

fn main() {
    let mut args = std::env::args().skip(1);
    let (dir, rules) = (
        args.next().expect("store dir"),
        args.next().expect("rules file"),
    );
    let text = std::fs::read_to_string(&rules).expect("rules");
    let store = NativeStore::open(&dir).expect("open");
    let prefixes: String = text
        .lines()
        .filter(|line| line.starts_with("@prefix"))
        .map(|line| format!("{line}\n"))
        .collect();
    for (index, rule) in text.split("\n{").skip(1).enumerate() {
        let single = format!("{prefixes}{{{}", rule.split("\n\n").next().unwrap_or(rule));
        let started = Instant::now();
        match store.reason("urn:profile", &single, false) {
            Ok(quads) => println!(
                "rule {:>2}: {:>8.1}ms {:>6} conclusions",
                index + 1,
                started.elapsed().as_secs_f64() * 1000.0,
                quads.len()
            ),
            Err(error) => println!("rule {:>2}: {error}", index + 1),
        }
    }
}
