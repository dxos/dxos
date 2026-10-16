use crate::closure::{Closures, hash};
use extism_pdk::*;
use moon_pdk_api::*;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

// Loaded by path rather than through a dependency: the root holds the tools every task runs (vitest,
// tsc, oxlint) and the shared configs, and every `.storybook/main.mts` imports one of the Storybook configs.
const TOOLCHAIN: [&str; 3] = [".", "tools/storybook-lit", "tools/storybook-react"];

// moon keeps one plugin instance per process, so each run parses the lockfile once.
static CLOSURES: OnceLock<Result<Closures, String>> = OnceLock::new();
static HASHES: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

#[plugin_fn]
pub fn register_toolchain(
    Json(_): Json<RegisterToolchainInput>,
) -> FnResult<Json<RegisterToolchainOutput>> {
    Ok(Json(RegisterToolchainOutput {
        name: "Dependency closure".into(),
        description: Some(
            "Keys each task on the third-party packages its project can load.".into(),
        ),
        plugin_version: env!("CARGO_PKG_VERSION").into(),
        ..Default::default()
    }))
}

// moon adds a toolchain to every task that uses one it requires.
#[plugin_fn]
pub fn define_requirements(
    Json(_): Json<DefineRequirementsInput>,
) -> FnResult<Json<DefineRequirementsOutput>> {
    Ok(Json(DefineRequirementsOutput {
        requires: vec!["javascript".into(), "node".into()],
        ..Default::default()
    }))
}

#[plugin_fn]
pub fn hash_task_contents(
    Json(input): Json<HashTaskContentsInput>,
) -> FnResult<Json<HashTaskContentsOutput>> {
    let closures = CLOSURES
        .get_or_init(|| {
            let path = input.context.workspace_root.join("pnpm-lock.yaml");
            let text = std::fs::read_to_string(&path)
                .map_err(|error| format!("Cannot read pnpm-lock.yaml: {error}"))?;
            Closures::parse(&text, &TOOLCHAIN)
        })
        .as_ref()
        .map_err(|error| Error::msg(error.clone()))?;

    let project = input.project.source;
    let mut hashes = HASHES.lock().unwrap();
    let hashes = hashes.get_or_insert_with(HashMap::new);
    let closure = match hashes.get(&project) {
        Some(closure) => closure.clone(),
        None => {
            let fingerprint = closures.fingerprint(&project).map_err(Error::msg)?;
            debug!("Dependency closure of {project}:\n{fingerprint}");
            hashes.insert(project.clone(), hash(&fingerprint));
            hashes[&project].clone()
        }
    };

    Ok(Json(HashTaskContentsOutput {
        contents: vec![serde_json::json!({ "dependencyClosure": closure })],
    }))
}
