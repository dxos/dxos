# Surface Props Audit

Audit of all components implementing the surface prop interfaces defined in `surface.ts`.

## SpaceSurfaceProps

| Component            | Plugin       | Type Definition                                   |
| -------------------- | ------------ | ------------------------------------------------- |
| DraftsArticle        | plugin-inbox | `SpaceSurfaceProps<{ mailbox: Mailbox.Mailbox }>` |
| SubscriptionsArticle | plugin-feed  | `SpaceSurfaceProps`                               |

## ObjectSurfaceProps

| Component                    | Plugin               | Type Definition                                                      |
| ---------------------------- | -------------------- | -------------------------------------------------------------------- |
| BlueprintArticle             | plugin-assistant     | `ObjectSurfaceProps<Blueprint.Blueprint>`                            |
| BoardContainer               | plugin-board         | `ObjectSurfaceProps<BoardType.Board>`                                |
| CalendarArticle              | plugin-inbox         | `ObjectSurfaceProps<Calendar.Calendar>`                              |
| CanvasContainer              | plugin-conductor     | `ObjectSurfaceProps<CanvasBoard.CanvasBoard>`                        |
| ChannelContainer             | plugin-thread        | `ObjectSurfaceProps<Channel.Channel>`                                |
| ChatContainer                | plugin-assistant     | `ObjectSurfaceProps<Chat.Chat \| undefined, ...>`                    |
| ChessArticle                 | plugin-chess         | `ObjectSurfaceProps<Chess.Game>`                                     |
| ChessCard                    | plugin-chess         | `ObjectSurfaceProps<Chess.Game>`                                     |
| CollectionPresenterContainer | plugin-presenter     | `ObjectSurfaceProps<Collection.Collection>`                          |
| DraftMessageArticle          | plugin-inbox         | `ObjectSurfaceProps<Message.Message>`                                |
| ExplorerContainer            | plugin-explorer      | `ObjectSurfaceProps<View.View>`                                      |
| FeedArticle                  | plugin-feed          | `ObjectSurfaceProps<Subscription.Feed>`                              |
| FileContainer                | plugin-wnfs          | `ObjectSurfaceProps<WnfsFile.File>`                                  |
| JournalContainer             | plugin-outliner      | `ObjectSurfaceProps<Journal.Journal>`                                |
| KanbanContainer              | plugin-kanban        | `ObjectSurfaceProps<Kanban.Kanban>`                                  |
| KanbanViewEditor             | plugin-kanban        | `ObjectSurfaceProps<Kanban.Kanban>`                                  |
| MailboxArticle               | plugin-inbox         | `ObjectSurfaceProps<Mailbox.Mailbox, ...>`                           |
| MapContainer                 | plugin-map           | `ObjectSurfaceProps<Map.Map, ...>`                                   |
| MarkdownContainer            | plugin-markdown      | `ObjectSurfaceProps<Text, ...>`                                      |
| MeetingContainer             | plugin-meeting       | `ObjectSurfaceProps<Meeting.Meeting>`                                |
| MessageArticle               | plugin-inbox         | `ObjectSurfaceProps<Message.Message, { mailbox?: Mailbox.Mailbox }>` |
| NotebookContainer            | plugin-script        | `ObjectSurfaceProps<Notebook.Notebook, ...>`                         |
| ObjectDetails                | plugin-space         | `ObjectSurfaceProps<Obj.Unknown>`                                    |
| PipelineContainer            | plugin-pipeline      | `ObjectSurfaceProps<Pipeline.Pipeline>`                              |
| ProjectArticle               | plugin-assistant     | `ObjectSurfaceProps<Project.Project>`                                |
| ProjectSettings              | plugin-assistant     | `ObjectSurfaceProps<Project.Project>`                                |
| PromptArticle                | plugin-assistant     | `ObjectSurfaceProps<Prompt.Prompt>`                                  |
| PromptList                   | plugin-assistant     | `ObjectSurfaceProps<Obj.Unknown>`                                    |
| ScriptContainer              | plugin-script        | `ObjectSurfaceProps<Script.Script, ...>`                             |
| SheetContainer               | plugin-sheet         | `ObjectSurfaceProps<Sheet.Sheet, ...>`                               |
| SketchContainer              | plugin-excalidraw    | `ObjectSurfaceProps<Canvas.Canvas, ...>`                             |
| SketchContainer              | plugin-sketch        | `ObjectSurfaceProps<Canvas.Canvas, ...>`                             |
| SpacetimeArticle             | plugin-spacetime     | `ObjectSurfaceProps<Scene.Scene>`                                    |
| StackContainer               | plugin-stack         | `ObjectSurfaceProps<Collection.Collection>`                          |
| TableCard                    | plugin-table         | `ObjectSurfaceProps<Table.Table>`                                    |
| TableContainer               | plugin-table         | `ObjectSurfaceProps<Table.Table>`                                    |
| TemplatePanel                | plugin-template      | `ObjectSurfaceProps<Obj.Unknown>`                                    |
| ThreadCompanion              | plugin-thread        | `ObjectSurfaceProps<Thread.Thread, ...>`                             |
| TranscriptionContainer       | plugin-transcription | `ObjectSurfaceProps<Transcript.Transcript>`                          |
| VideoCard                    | plugin-youtube       | `ObjectSurfaceProps<Video.YouTubeVideo>`                             |
| VoxelArticle                 | plugin-voxel         | `ObjectSurfaceProps<Voxel.World>`                                    |
| VoxelCard                    | plugin-voxel         | `ObjectSurfaceProps<Voxel.World>`                                    |
| ZenArticle                   | plugin-zen           | `ObjectSurfaceProps<Dream.Dream>`                                    |

### Candidates for CompanionSurfaceProps

These components use `ObjectSurfaceProps` but are used exclusively (or primarily) as companions.

| Component        | Plugin         | Notes                                                                                                                   |
| ---------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| MeetingContainer | plugin-meeting | Also used standalone (non-companion), so `ObjectSurfaceProps` is correct.                                               |
| ThreadCompanion  | plugin-thread  | `companionTo` is mapped to `subject` in the surface binding (same object); doesn't cleanly fit `CompanionSurfaceProps`. |
| MessageArticle   | plugin-inbox   | `companionTo` is optional in the surface filter; used both with and without a companion.                                |

## CompanionSurfaceProps

| Component     | Plugin           | Type Definition                             |
| ------------- | ---------------- | ------------------------------------------- |
| ChatCompanion | plugin-assistant | `CompanionSurfaceProps<Chat.Chat>`          |
| EventArticle  | plugin-inbox     | `CompanionSurfaceProps<EventType.Event>`    |
| MeetingsList  | plugin-meeting   | `CompanionSurfaceProps<undefined>`          |
| VideoArticle  | plugin-youtube   | `CompanionSurfaceProps<Video.YouTubeVideo>` |

### Inline companion surfaces

These companion surfaces are defined inline in `react-surface.tsx` and don't delegate to a typed component.

| Surface ID                  | Plugin            | companionTo Type                            |
| --------------------------- | ----------------- | ------------------------------------------- |
| `companion.automation`      | plugin-automation | `Obj.Unknown`                               |
| `companion.invocations`     | plugin-pipeline   | `Pipeline.Pipeline`                         |
| `companion-invocations`     | plugin-assistant  | `Sequence \| Prompt.Prompt`                 |
| `companion.execute`         | plugin-script     | `Script.Script`                             |
| `companion.logs`            | plugin-script     | `Script.Script`                             |
| `object-debug`              | plugin-debug      | `Obj.Unknown`                               |
| `companion.object-settings` | plugin-space      | `Obj.Unknown`                               |
| `selected-objects`          | plugin-space      | `Obj.OfShape<{ view: Ref.Ref<View.View> }>` |
| `chat-companion`            | plugin-thread     | `Channel.Channel`                           |
| `comments`                  | plugin-thread     | `Obj.Unknown`                               |

## SettingsSurfaceProps

| Component             | Plugin               | Type Definition                              |
| --------------------- | -------------------- | -------------------------------------------- |
| AssistantSettings     | plugin-assistant     | `SettingsSurfaceProps<Assistant.Settings>`   |
| DebugSettings         | plugin-debug         | `SettingsSurfaceProps<Debug.Settings, ...>`  |
| DeckSettings          | plugin-deck          | `SettingsSurfaceProps<Settings.Settings>`    |
| FilesSettings         | plugin-files         | `SettingsSurfaceProps<Files.Settings, ...>`  |
| MarkdownSettings      | plugin-markdown      | `SettingsSurfaceProps<Markdown.Settings>`    |
| MeetingSettings       | plugin-meeting       | `SettingsSurfaceProps<Settings.Settings>`    |
| ObservabilitySettings | plugin-observability | `SettingsSurfaceProps<Settings.Settings>`    |
| PresenterSettings     | plugin-presenter     | `SettingsSurfaceProps<Settings.Settings>`    |
| ScriptPluginSettings  | plugin-script        | `SettingsSurfaceProps<Script.Settings, ...>` |
| SketchSettings        | plugin-excalidraw    | `SettingsSurfaceProps<Settings.Settings>`    |
| SketchSettings        | plugin-sketch        | `SettingsSurfaceProps<Settings.Settings>`    |
| SpacePluginSettings   | plugin-space         | `SettingsSurfaceProps<Space.Settings, ...>`  |
| SpacetimeSettings     | plugin-spacetime     | `SettingsSurfaceProps<Settings.Settings>`    |
| ThreadSettings        | plugin-thread        | `SettingsSurfaceProps<Settings.Settings>`    |
