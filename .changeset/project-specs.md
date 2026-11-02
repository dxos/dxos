---
'@dxos/compute': minor
'@dxos/plugin-code': minor
'@dxos/plugin-projects': minor
'@dxos/types': minor
---

`Spec` moves to `@dxos/compute` (`@dxos/compute/Spec`, typename `org.dxos.type.projects.spec` 0.3.0) and holds its `.mdl` text as `content`, with the dialects it uses listed in `dialects`. A project owns any number of specs: `Project` 0.7.0 replaces `spec` with `specs`. The feature map moves from plugin-projects to plugin-code: the `Feature` type and its links, the canvas and board views, feature articles, companions and levels, the software package, the feature operations, task links, the feature templates and the feature and spec migrations. A spec's features and canvas layout are annotations on it. plugin-projects keeps projects, generic spec editing, extension packages and tasks, and gains the seams plugin-code fills: `ProjectCapabilities.SpecView`, the `ProjectSurface.SpecView`, `ProjectSurface.Level` and `ProjectSurface.LevelOverview` surface roles, and the `ProjectGraph`, `ProjectHooks`, `SpecCommands` and `LegacyProject` modules.

Breaking:

- `SpecDocument` is removed from `@dxos/types`. plugin-code's migrations fold each spec document into its spec, moving its text and file links, then delete it.
- `Project` 0.7.0 replaces `spec` with `specs`, and `Spec` 0.3.0 replaces `document`, `features` and `layout` with `content`, `dialects` and annotations. Migrated objects cannot be read by an older build.
- `@dxos/plugin-projects` no longer exports `Feature`, `FeatureEmbed`, `FeatureLink`, `FeatureMap`, `FeatureMapView`, `FeatureOperation`, `FeatureSpec`, `LegacyFeature`, `LegacyShowcase`, `LegacySpec`, `Showcase` or `SpecText`; import them from `@dxos/plugin-code/<Name>`. `FeatureSeed` and `FeatureEditingPlugin` move from `@dxos/plugin-projects/testing` to `@dxos/plugin-code/testing`.
- The feature operations are handled by `@dxos/plugin-code/FeatureOperationHandlerSet`, not `ProjectOperationHandlerSet`; EDGE's operation-service must register it for feature operations to run there.
- Feature operation keys move from `org.dxos.operation.projects.*` to `org.dxos.operation.code.*` (`createFeature`, `updateFeature`, `deleteFeature`, `createSpec`, `updateSpec`, `addFeatureDependency`, `removeFeatureDependency`, `linkFeatureTask`, `createShowcase`, `getFeatures`, `importSpecFeatures`, `exportSpecFeatures`, `importFeatureLinks`), so their tool names change from `projects-*` to `code-*`. Skills saved with the old keys no longer name them.
- The project skill (`org.dxos.skill.project`) no longer declares the feature operations; the new Feature Map skill (`org.dxos.skill.featureMap`) does.
- Feature types, migrations, surfaces and operations are present only while plugin-code is enabled. plugin-code is not on by default in production or on mobile, so those users lose the feature map until they enable it.
- At the project's own level, Add spec on an empty Specs tab opens the object form instead of making a spec through a feature operation.
- Test ids: the Specs tab's view toggle is `projectsPlugin.specView.<id>` (was `projectsPlugin.featureMap.<mode>`), and the spec's text there is `projectsPlugin.spec.document` (was `feature-map.document`).
- The `scan-feature-links` task and the `FEATURE-LINKS` spec move to plugin-code; the spec's id is `org.dxos.plugin.code.featureLinks`.
