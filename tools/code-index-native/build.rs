use std::fs;
use std::path::{Path, PathBuf};

/// Every `.rs` file under `dir`, recursively.
fn rust_files(dir: &Path, found: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            rust_files(&path, found);
        } else if path.extension().is_some_and(|extension| extension == "rs") {
            found.push(path);
        }
    }
}

/// FNV-1a 64 over each input's crate-relative path and contents, in path order. The CLI hashes the
/// sources on disk the same way (`sourcesHash` in `tools/code-index/src/internal/native.ts`), so an
/// addon left behind by a pull that changed the crate is caught by name instead of by its symptoms.
fn sources_hash() -> String {
    let mut files: Vec<PathBuf> = ["Cargo.toml", "Cargo.lock", "build.rs"]
        .iter()
        .map(PathBuf::from)
        .collect();
    rust_files(Path::new("src"), &mut files);
    let mut entries: Vec<(String, Vec<u8>)> = files
        .iter()
        .filter_map(|path| {
            let relative = path.to_string_lossy().replace('\\', "/");
            fs::read(path).ok().map(|contents| (relative, contents))
        })
        .collect();
    entries.sort_by(|left, right| left.0.as_bytes().cmp(right.0.as_bytes()));
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for (path, contents) in &entries {
        for byte in path
            .as_bytes()
            .iter()
            .chain([0u8].iter())
            .chain(contents.iter())
            .chain([0u8].iter())
        {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x0100_0000_01b3);
        }
    }
    format!("{hash:016x}")
}

fn main() {
    println!("cargo:rerun-if-changed=src");
    println!("cargo:rerun-if-changed=Cargo.toml");
    println!("cargo:rerun-if-changed=Cargo.lock");
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rustc-env=CODE_INDEX_SOURCES={}", sources_hash());
    if std::env::var_os("CARGO_FEATURE_NAPI").is_some() {
        napi_build::setup();
    }
}
