//
// Copyright 2026 DXOS.org
//

//! Representative benchmarks over a synthetic corpus shaped like a real index: files that declare
//! exported symbols, layers built with `Layer.effect(Tag, …)`, operations and handlers, plugins
//! adding modules through barrels (`aliasOf`), namespace barrels (`namespaceOf`) and test imports —
//! so every shipped rule file has work to do, including the negation in `60-canonical.n3`.
//!
//! `cargo bench` (or `moon run code-index-native:cargo-bench`); `CODE_INDEX_BENCH_FILES` scales it
//! (default 5000 files, ~1/3 of this repository). Every incremental result is checked against a full
//! recomputation, so a fast wrong answer fails the run instead of reporting a number.

use std::fmt::Write;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use code_index_native::store::{NativeStore, Stratum};
use oxigraph::model::NamedNode;

const DEUS: &str = "https://dxos.org/vocab/deus#";
const MODULE: &str = "https://dxos.org/deus/module/";
const DERIVED: &str = "https://dxos.org/deus/graph/derived/";
const RDF_TYPE: &str = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const TRUE: &str = "\"true\"^^<http://www.w3.org/2001/XMLSchema#boolean>";

fn rules_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../code-index/rules")
}

fn shipped() -> Vec<Stratum> {
    let mut names: Vec<String> = fs::read_dir(rules_dir())
        .expect("rules dir")
        .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
        .filter(|name| name.ends_with(".n3"))
        .collect();
    names.sort();
    names
        .into_iter()
        .map(|name| Stratum {
            graph: format!("{DERIVED}{}", name.trim_end_matches(".n3")),
            rules: fs::read_to_string(rules_dir().join(&name)).expect("rules"),
        })
        .collect()
}

fn file_iri(index: usize) -> String {
    format!(
        "https://dxos.org/deus/file/pkg{}%2Fsrc%2Ff{index}.ts",
        index % 50
    )
}

fn symbol_iri(file: usize, symbol: usize) -> String {
    format!("{}#s{symbol}", file_iri(file))
}

fn graph_iri(file: usize, revision: usize) -> String {
    format!("https://dxos.org/deus/graph/f{file}.ts#{revision}")
}

/// One file's quads, as the TypeScript analyzer would assert them (a representative subset).
fn file_quads(file: usize, revision: usize, files: usize) -> String {
    let graph = graph_iri(file, revision);
    let mut out = String::new();
    let mut quad = |s: &str, p: &str, o: String| {
        let _ = writeln!(out, "<{s}> <{p}> {o} <{graph}> .");
    };
    let this = file_iri(file);
    let path = if file.is_multiple_of(10) {
        format!("pkg/src/f{file}.test.ts")
    } else {
        format!("pkg/src/f{file}.ts")
    };
    quad(&this, RDF_TYPE, format!("<{DEUS}File>"));
    quad(&this, &format!("{DEUS}path"), format!("\"{path}\""));
    quad(
        &this,
        &format!("{DEUS}imports"),
        format!("<{}>", file_iri((file * 7 + 1 + revision) % files)),
    );
    quad(
        &this,
        &format!("{DEUS}imports"),
        format!("<{}>", file_iri((file * 13 + 3) % files)),
    );
    for symbol in 0..20 {
        let iri = symbol_iri(file, symbol);
        quad(&this, &format!("{DEUS}declares"), format!("<{iri}>"));
        quad(&iri, RDF_TYPE, format!("<{DEUS}Symbol>"));
        quad(&iri, &format!("{DEUS}name"), format!("\"s{symbol}\""));
        quad(&iri, &format!("{DEUS}exported"), TRUE.to_owned());
        quad(
            &iri,
            &format!("{DEUS}line"),
            format!(
                "\"{}\"^^<http://www.w3.org/2001/XMLSchema#integer>",
                symbol * 3 + 1
            ),
        );
        quad(
            &iri,
            &format!("{DEUS}snippet"),
            format!("\"export const s{symbol} = make(/* … */);\""),
        );
        // References: the bulk of a real graph, and what the join-heavy rules walk.
        for reference in 0..6 {
            let target = symbol_iri(
                (file + reference * 17 + 1) % files,
                (symbol + reference) % 20,
            );
            let predicate = if reference % 2 == 0 {
                "implDependsOn"
            } else {
                "apiDependsOn"
            };
            quad(&iri, &format!("{DEUS}{predicate}"), format!("<{target}>"));
        }
        match symbol {
            0 => quad(
                &iri,
                &format!("{DEUS}extends"),
                format!("<{MODULE}effect%2FContext#Service>"),
            ),
            1 => {
                quad(
                    &iri,
                    &format!("{DEUS}constructedBy"),
                    format!("<{MODULE}effect%2FLayer#effect>"),
                );
                quad(
                    &iri,
                    &format!("{DEUS}argument"),
                    format!("<{}>", symbol_iri(file, 0)),
                );
            }
            2 => quad(
                &iri,
                &format!("{DEUS}constructedBy"),
                format!("<{MODULE}%40dxos%2Fcompute%2FOperation#make>"),
            ),
            3 => {
                quad(
                    &iri,
                    &format!("{DEUS}pipedThrough"),
                    format!("<{MODULE}%40dxos%2Fcompute%2FOperation#withHandler>"),
                );
                quad(
                    &iri,
                    &format!("{DEUS}derivedFrom"),
                    format!("<{}>", symbol_iri(file, 2)),
                );
            }
            4 if file.is_multiple_of(5) => {
                quad(
                    &iri,
                    &format!("{DEUS}constructedBy"),
                    format!("<{MODULE}%40dxos%2Fapp-framework%2FPlugin#define>"),
                );
                for module in 0..4 {
                    quad(
                        &iri,
                        &format!("{DEUS}implDependsOn"),
                        format!("<{}>", symbol_iri((file + module + 1) % files, 6)),
                    );
                }
            }
            5 => quad(
                &iri,
                &format!("{DEUS}constructedBy"),
                format!("<{MODULE}%40dxos%2Fapp-framework%2FCapability#makeModule>"),
            ),
            6 => quad(
                &iri,
                &format!("{DEUS}aliasOf"),
                format!("<{}>", symbol_iri(file, 5)),
            ),
            7 if file % 25 == 1 => {
                // A namespace barrel: `export * as N from './f…'` publishes the neighbour whole.
                quad(
                    &iri,
                    &format!("{DEUS}namespaceOf"),
                    format!("<{}>", file_iri((file + 1) % files)),
                );
            }
            _ => {}
        }
    }
    out
}

fn dir_size(path: &Path) -> u64 {
    fs::read_dir(path)
        .map(|entries| {
            entries
                .filter_map(Result::ok)
                .map(|entry| match entry.metadata() {
                    Ok(meta) if meta.is_dir() => dir_size(&entry.path()),
                    Ok(meta) => meta.len(),
                    Err(_) => 0,
                })
                .sum()
        })
        .unwrap_or(0)
}

/// Every stratum's conclusions as sorted N-Triples lines, so two states compare quad for quad.
fn derived(store: &NativeStore, strata: &[Stratum]) -> Vec<Vec<String>> {
    strata
        .iter()
        .map(|stratum| {
            let quads = store
                .match_quads(
                    None,
                    None,
                    None,
                    Some(NamedNode::new_unchecked(stratum.graph.as_str()).into()),
                )
                .expect("match");
            let mut lines: Vec<String> = quads
                .into_iter()
                .map(|quad| format!("{} {} {}", quad.subject, quad.predicate, quad.object))
                .collect();
            lines.sort_unstable();
            lines
        })
        .collect()
}

/// The check every incremental number depends on: the maintained graphs equal a recomputation,
/// quad for quad. Leaves the store recomputed (and signed), so the next pass is incremental again.
fn assert_matches_recomputation(store: &NativeStore, strata: &[Stratum], after: &str) {
    let maintained = derived(store, strata);
    store.invalidate().expect("invalidate");
    time("reason: recomputation for comparison", || {
        store.reason_all(strata).expect("reason")
    });
    let recomputed = derived(store, strata);
    for ((stratum, maintained), recomputed) in strata.iter().zip(&maintained).zip(&recomputed) {
        assert_eq!(
            maintained, recomputed,
            "after {after}: incremental maintenance of {} diverged from recomputation",
            stratum.graph
        );
    }
}

fn time<T>(label: &str, work: impl FnOnce() -> T) -> T {
    let started = Instant::now();
    let value = work();
    println!(
        "{label:<44} {:>10.1} ms",
        started.elapsed().as_secs_f64() * 1000.0
    );
    value
}

fn main() {
    let files: usize = std::env::var("CODE_INDEX_BENCH_FILES")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(5000);
    let strata = shipped();
    let dir = tempfile::tempdir().expect("tempdir");
    let store = NativeStore::open(dir.path()).expect("open");
    println!("synthetic corpus: {files} files");

    time("commit: every file, one swap each", || {
        for file in 0..files {
            store
                .put_document_nquads(&graph_iri(file, 0), &[], &file_quads(file, 0, files))
                .expect("commit");
        }
    });
    let quads = store.quad_count().expect("count");
    println!("{:<44} {:>10}", "quads", quads);

    let outcomes = time("reason: all rule files, from nothing", || {
        store.reason_all(&strata).expect("reason")
    });
    for outcome in &outcomes {
        println!(
            "  {:<42} {:>10.1} ms  {:>7} derived",
            outcome.graph.trim_start_matches(DERIVED),
            outcome.duration_ms,
            outcome.derived
        );
    }
    // Journalled commits: what a warm pass pays per file once a signature exists.
    time("commit: one file, journalled", || {
        store
            .put_document_nquads(
                &graph_iri(1, 1),
                &[graph_iri(1, 0)],
                &file_quads(1, 1, files),
            )
            .expect("commit")
    });
    let outcomes = time("reason: incremental after one file", || {
        store.reason_all(&strata).expect("reason")
    });
    assert!(
        outcomes.iter().all(|outcome| outcome.incremental),
        "expected the incremental path"
    );
    assert_matches_recomputation(&store, &strata, "one file");

    // Ten files, checked the same way.
    time("commit: ten files, journalled", || {
        for file in (0..files).step_by((files / 10).max(1)).take(10) {
            store
                .put_document_nquads(
                    &graph_iri(file, 2),
                    &[graph_iri(file, 0), graph_iri(file, 1)],
                    &file_quads(file, 2, files),
                )
                .expect("commit");
        }
    });
    time("reason: incremental after ten files", || {
        store.reason_all(&strata).expect("reason")
    });
    assert_matches_recomputation(&store, &strata, "ten files");

    drop(store);
    println!(
        "{:<44} {:>10.1} MB",
        "store size on disk",
        dir_size(dir.path()) as f64 / 1e6
    );
}
