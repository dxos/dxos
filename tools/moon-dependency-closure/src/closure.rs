//! The third-party packages a project's code and tools can load, read from `pnpm-lock.yaml`.
//!
//! A project's closure follows its workspace links, since their dependencies are loaded through it, and
//! includes the closure of every toolchain project. Each package is hashed with its integrity and with
//! what it resolves its own dependencies to, so a package re-pointed to another version the closure
//! already holds changes the hash too. Anything the lockfile holds that this cannot follow is an error:
//! a weaker key would pass from the cache.

use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Lockfile {
    lockfile_version: String,
    #[serde(default)]
    settings: serde_json::Value,
    importers: BTreeMap<String, Importer>,
    #[serde(default)]
    packages: BTreeMap<String, Package>,
    #[serde(default)]
    snapshots: BTreeMap<String, Snapshot>,
}

#[derive(Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct Importer {
    dependencies: BTreeMap<String, ImporterDependency>,
    dev_dependencies: BTreeMap<String, ImporterDependency>,
    optional_dependencies: BTreeMap<String, ImporterDependency>,
}

#[derive(Deserialize)]
struct ImporterDependency {
    version: String,
}

#[derive(Deserialize)]
struct Package {
    resolution: serde_json::Value,
}

#[derive(Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct Snapshot {
    dependencies: BTreeMap<String, String>,
    optional_dependencies: BTreeMap<String, String>,
}

pub struct Closures {
    lockfile: Lockfile,
    toolchain: BTreeSet<String>,
}

impl Closures {
    /// Parses `pnpm-lock.yaml`; every closure includes the closure of the `toolchain` projects.
    pub fn parse(text: &str, toolchain: &[&str]) -> Result<Self, String> {
        let lockfile: Lockfile = serde_yaml::from_str(text)
            .map_err(|error| format!("Cannot parse pnpm-lock.yaml: {error}"))?;
        if lockfile.lockfile_version != "9.0" {
            return Err(format!(
                "Unsupported lockfileVersion {}: update tools/moon-dependency-closure.",
                lockfile.lockfile_version
            ));
        }

        let mut closures = Self {
            lockfile,
            toolchain: BTreeSet::new(),
        };
        closures.toolchain = closures.closure(toolchain)?;
        Ok(closures)
    }

    /// The text hashed for `project`: the lockfile settings, then one line per package.
    pub fn fingerprint(&self, project: &str) -> Result<String, String> {
        let mut keys = self.closure(&[project])?;
        keys.extend(self.toolchain.iter().cloned());
        let mut lines = vec![self.lockfile.settings.to_string()];
        for key in &keys {
            lines.push(self.describe(key)?);
        }
        Ok(lines.join("\n"))
    }

    fn closure(&self, projects: &[&str]) -> Result<BTreeSet<String>, String> {
        let mut visited = BTreeSet::new();
        let mut pending_projects: Vec<String> =
            projects.iter().map(|project| project.to_string()).collect();
        let mut pending_keys = Vec::new();
        while let Some(project) = pending_projects.pop() {
            if !visited.insert(project.clone()) {
                continue;
            }
            let importer = self
                .lockfile
                .importers
                .get(&project)
                .ok_or_else(|| format!("{project} is not a workspace project."))?;
            for (name, dependency) in importer
                .dependencies
                .iter()
                .chain(&importer.dev_dependencies)
                .chain(&importer.optional_dependencies)
            {
                match dependency.version.strip_prefix("link:") {
                    Some(path) => pending_projects.push(join(&project, path)),
                    None => pending_keys.push(self.snapshot_key(name, &dependency.version)?),
                }
            }
        }

        let mut keys = BTreeSet::new();
        while let Some(key) = pending_keys.pop() {
            if keys.contains(&key) {
                continue;
            }
            for (name, version) in self.edges(&key) {
                pending_keys.push(self.snapshot_key(name, version)?);
            }
            keys.insert(key);
        }
        Ok(keys)
    }

    /// Snapshot keys are `name@version(peers)`; an aliased dependency's version is already a key.
    fn snapshot_key(&self, name: &str, version: &str) -> Result<String, String> {
        let key = format!("{name}@{version}");
        if self.lockfile.snapshots.contains_key(&key) {
            Ok(key)
        } else if self.lockfile.snapshots.contains_key(version) {
            Ok(version.to_string())
        } else {
            Err(format!("No snapshot for {key}."))
        }
    }

    fn edges(&self, key: &str) -> BTreeMap<&str, &str> {
        let snapshot = &self.lockfile.snapshots[key];
        snapshot
            .dependencies
            .iter()
            .chain(&snapshot.optional_dependencies)
            .map(|(name, version)| (name.as_str(), version.as_str()))
            .collect()
    }

    fn describe(&self, key: &str) -> Result<String, String> {
        // A snapshot key appends peers and patches, in parentheses, to the package key.
        let package = key.split_once('(').map_or(key, |(package, _)| package);
        let resolution = &self
            .lockfile
            .packages
            .get(package)
            .ok_or_else(|| format!("No resolution for {key}."))?
            .resolution;
        let edges = serde_json::Value::from_iter(
            self.edges(key)
                .into_iter()
                .map(|(name, version)| (name.to_string(), serde_json::Value::from(version))),
        );
        Ok(format!("{key} {resolution} {edges}"))
    }
}

pub fn hash(fingerprint: &str) -> String {
    format!("{:x}", Sha256::digest(fingerprint))
}

/// Resolves a `link:` path against the project that declares it, relative to the workspace root.
fn join(project: &str, path: &str) -> String {
    let mut parts: Vec<&str> = project
        .split('/')
        .filter(|part| !part.is_empty() && *part != ".")
        .collect();
    for part in path.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            part => parts.push(part),
        }
    }
    if parts.is_empty() {
        ".".to_string()
    } else {
        parts.join("/")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const LOCKFILE: &str = r#"
lockfileVersion: '9.0'
settings:
  autoInstallPeers: false
importers:
  .:
    devDependencies:
      tool: {specifier: ^1.0.0, version: 1.0.0}
  packages/a:
    dependencies:
      '@dxos/b': {specifier: workspace:*, version: link:../b}
      left: {specifier: ^1.0.0, version: 1.0.0}
  packages/b:
    dependencies:
      right: {specifier: ^1.0.0, version: 1.0.0}
  packages/c: {}
packages:
  left@1.0.0: {resolution: {integrity: sha512-left}}
  right@1.0.0: {resolution: {integrity: sha512-right}}
  shared@1.0.0: {resolution: {integrity: sha512-shared1}}
  shared@2.0.0: {resolution: {integrity: sha512-shared2}}
  tool@1.0.0: {resolution: {integrity: sha512-tool}}
snapshots:
  left@1.0.0: {dependencies: {shared: 1.0.0}}
  right@1.0.0: {dependencies: {shared: 2.0.0}}
  shared@1.0.0: {}
  shared@2.0.0: {}
  tool@1.0.0: {dependencies: {shared: 1.0.0}}
"#;

    fn hashes(lockfile: &str) -> (String, String) {
        let closures = Closures::parse(lockfile, &["."]).unwrap();
        let project = |name| hash(&closures.fingerprint(name).unwrap());
        (project("packages/a"), project("packages/c"))
    }

    #[test]
    fn follows_workspace_links_into_transitive_dependencies() {
        let (a, c) = hashes(LOCKFILE);
        let (a2, c2) = hashes(&LOCKFILE.replace("sha512-shared2", "sha512-republished"));
        assert_ne!(
            a, a2,
            "packages/a reaches shared@2.0.0 through packages/b and right"
        );
        assert_eq!(c, c2, "packages/c does not reach it");
    }

    #[test]
    fn re_pointed_dependency_changes_the_hash() {
        // Both versions of `shared` stay in packages/a's closure, so only the edge differs.
        let (a, _) = hashes(LOCKFILE);
        let (a2, _) = hashes(&LOCKFILE.replace(
            "left@1.0.0: {dependencies: {shared: 1.0.0}}",
            "left@1.0.0: {dependencies: {shared: 2.0.0}}",
        ));
        assert_ne!(a, a2);
    }

    #[test]
    fn toolchain_dependencies_are_in_every_closure() {
        let (a, c) = hashes(LOCKFILE);
        let (a2, c2) = hashes(&LOCKFILE.replace("sha512-tool", "sha512-tool2"));
        assert_ne!(a, a2);
        assert_ne!(c, c2);
    }

    #[test]
    fn rejects_what_it_cannot_follow() {
        assert!(Closures::parse(&LOCKFILE.replace("'9.0'", "'10.0'"), &["."]).is_err());
        assert!(
            Closures::parse(&LOCKFILE.replace("link:../b", "link:../missing"), &["."])
                .unwrap()
                .fingerprint("packages/a")
                .is_err()
        );
        assert!(
            Closures::parse(
                &LOCKFILE.replace("right@1.0.0: {dependencies", "gone@1.0.0: {dependencies"),
                &["."]
            )
            .unwrap()
            .fingerprint("packages/b")
            .is_err()
        );
        assert!(
            Closures::parse(
                &LOCKFILE.replace("  left@1.0.0: {resolution: {integrity: sha512-left}}\n", ""),
                &["."]
            )
            .unwrap()
            .fingerprint("packages/a")
            .is_err()
        );
    }
}
