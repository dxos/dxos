//
// Copyright 2026 DXOS.org
//

//! The Rust kernel runs the DEUS compiler (the seed) on the compiler's own sources and must
//! reproduce the seed byte for byte, as the TypeScript kernel does (`deus-lang/src/seed.test.ts`).

use std::path::Path;
use std::process::Command;

#[test]
fn compiles_the_compiler_to_the_seed() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../deus-lang");
    let out = std::env::temp_dir().join(format!("deus-kernel-seed-{}.image", std::process::id()));
    let status = Command::new(env!("CARGO_BIN_EXE_deus-kernel"))
        .args([
            "compile",
            root.join("deus").to_str().unwrap(),
            "--main",
            "Cli.main",
            "-o",
            out.to_str().unwrap(),
        ])
        .status()
        .expect("the kernel starts");
    assert!(status.success(), "self-compile failed: {status}");
    let built = std::fs::read(&out).expect("the image was written");
    let seed = std::fs::read(root.join("seed/deus.image")).expect("the seed exists");
    let _ = std::fs::remove_file(&out);
    assert!(
        built == seed,
        "the Rust kernel's self-compile differs from seed/deus.image"
    );
}

#[test]
fn defects_and_budgets_exit_with_the_kernel_codes() {
    let dir = std::env::temp_dir().join(format!("deus-kernel-codes-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let image = dir.join("defect.image");
    std::fs::write(
        &image,
        "(def \"main\" (lam (app (prim \"Int.div\") (int 1) (int 0)))) (main \"main\")",
    )
    .unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_deus-kernel"))
        .env("DEUS_SEED", &image)
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(70));
    assert_eq!(
        String::from_utf8_lossy(&output.stderr),
        "defect: division by zero\n  at #main\n"
    );

    let looping = dir.join("loop.image");
    std::fs::write(
        &looping,
        "(def \"loop\" (lam (app (ref \"loop\") (var 0)))) (def \"main\" (lam (app (ref \"loop\") (int 0)))) (main \"main\")",
    )
    .unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_deus-kernel"))
        .env("DEUS_SEED", &looping)
        .env("DEUS_MAX_STEPS", "1000")
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(70));
    assert!(String::from_utf8_lossy(&output.stderr)
        .starts_with("defect: step budget of 1000 exhausted\n"));

    std::fs::write(&image, "(def \"main\"").unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_deus-kernel"))
        .env("DEUS_SEED", &image)
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(71));
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn runs_an_image_appended_to_its_executable() {
    let dir = std::env::temp_dir().join(format!("deus-kernel-native-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let binary = dir.join("hello");
    let mut bytes = std::fs::read(env!("CARGO_BIN_EXE_deus-kernel")).unwrap();
    let image = "(def \"main\" (lam (app (op \"#IO\" 0 1) (text \"hello\")))) (main \"main\")";
    bytes.extend_from_slice(image.as_bytes());
    bytes.extend_from_slice(format!("{:020}DEUSIMG1", image.len()).as_bytes());
    std::fs::write(&binary, bytes).unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&binary, std::fs::Permissions::from_mode(0o755)).unwrap();
    }
    let output = Command::new(&binary).output().unwrap();
    assert_eq!(String::from_utf8_lossy(&output.stdout), "hello");
    assert_eq!(output.status.code(), Some(0));
    let _ = std::fs::remove_dir_all(&dir);
}
