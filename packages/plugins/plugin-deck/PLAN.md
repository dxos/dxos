# Deck Refactor

- This is a complex refactor. Think deeply about these tasks and create a plan.
- Use this document to track progress to the user.
- Work only on the section of the document/plan that you are directed to work on.
- Format, lint, commit and push after each step.

## Phase 1

- [x] Move DeckLayout to `./containers`
- [x] Factor out DeckMain to `./containeres`
  - Remove dependency on `invokePromise` by providing `onLayoutChange` callback.
  - Move ContentEmpty, StatusBar, Topbar as private components to the same DeckMain directory
- [x] Craete story for `DeckMain`.

### Settings Surfaces

`DeckSettings` is an exemplar for plugins have declare a settings type and surface component.

- [x] List below all plugins that have settings surfaces.
- [x] For each surface, ensure all of:
  - There is a container component that uses the `SettingsSurfaceProps` generic type.
  - There is an associated storybook.
  - That settings controls are marked as disabled if the callback property is not set.

#### Plugins with settings surfaces

| Plugin               | Component             | `SettingsSurfaceProps` | Storybook | Disabled |
| -------------------- | --------------------- | ---------------------- | --------- | -------- |
| plugin-deck          | DeckSettings          | yes                    | yes       | yes      |
| plugin-assistant     | AssistantSettings     | yes                    | yes       | yes      |
| plugin-debug         | DebugSettings         | yes                    | yes       | yes      |
| plugin-excalidraw    | SketchSettings        | yes                    | yes       | yes      |
| plugin-files         | FilesSettings         | yes                    | yes       | yes      |
| plugin-markdown      | MarkdownSettings      | yes                    | yes       | yes      |
| plugin-meeting       | MeetingSettings       | yes                    | yes       | yes      |
| plugin-observability | ObservabilitySettings | yes                    | yes       | n/a      |
| plugin-presenter     | PresenterSettings     | yes                    | yes       | yes      |
| plugin-script        | ScriptPluginSettings  | yes                    | yes       | yes      |
| plugin-sketch        | SketchSettings        | yes                    | yes       | yes      |
| plugin-space         | SpacePluginSettings   | yes                    | yes       | yes      |
| plugin-thread        | ThreadSettings        | yes                    | yes       | n/a      |

## Review

- [x] Settings components should be in ./components
- [x] Settings components should not use useOperationInvoker; instead rely on the SettingsSurfaceProps callback
- [x] All settings props should be defined in ./types/Settings.ts
  - [x] Rename Props like this: ObservabilitySettingsSchema/ObservabilitySettingsProps => Settings.Settings
  - [x] Export settings using namespace and include: "// @import-as-namespace"
  - [x] Add "settings" tag to all associated stories
