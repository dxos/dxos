# Operation key audit

Every `Operation.make` definition in the repo, by DXN key.

**The tool name is not listed.** It derives from the key by `Operation.toolName`
([Operation.ts](../../../packages/core/compute/compute/src/Operation.ts)) — strip the constant
`org.dxos.operation.` prefix, kebab-case each camelCase segment, join with `-`. Recording it here
would be a second implementation of that rule, free to drift from the runtime without anything
noticing. `org.dxos.operation.markdown.create` is `markdown-create`; read the rest off the key.

Regenerate with [scan.mjs](./scan.mjs):

```bash
node .agents/projects/operation-keys/scan.mjs
```

**Skill** marks the operations a `Skill.toolDefinitions({ operations: [...] })` binds — the set the
model can call. Unmarked rows are app or runtime operations, invocable by key but never advertised
as tools.

## Summary

- 452 operations; 132 bound into skills.
- 30 keys omit the domain segment — all `com.example` fixtures, which the `operation-key-shape`
  rule permits: a fixture names no package, so it owns no domain.

## Operations

Sorted with DXOS operations first and `com.example` fixtures last.

| DXN key                                                     | Package                      | File                                                              | `meta.name`                     | Skill |
| ----------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------- | ------------------------------- | ----- |
| `org.dxos.operation.appToolkit.acceptChange`                | `@dxos/app-toolkit`          | `operations/CollaborationOperation.ts`                            | Accept Change                   |       |
| `org.dxos.operation.appToolkit.acceptProposal`              | `@dxos/app-toolkit`          | `operations/CollaborationOperation.ts`                            | Accept Proposal                 |       |
| `org.dxos.operation.appToolkit.addToast`                    | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Add Toast                       |       |
| `org.dxos.operation.appToolkit.close`                       | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Close                           |       |
| `org.dxos.operation.appToolkit.expose`                      | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Expose                          |       |
| `org.dxos.operation.appToolkit.open`                        | `@dxos/app-toolkit`          | `operations/SettingsOperation.ts`                                 | Open Settings                   | ✓     |
| `org.dxos.operation.appToolkit.open`                        | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Open                            | ✓     |
| `org.dxos.operation.appToolkit.openPluginRegistry`          | `@dxos/app-toolkit`          | `operations/SettingsOperation.ts`                                 | Open Plugin Registry            |       |
| `org.dxos.operation.appToolkit.rejectChange`                | `@dxos/app-toolkit`          | `operations/CollaborationOperation.ts`                            | Reject Change                   |       |
| `org.dxos.operation.appToolkit.resolveNavigationTargets`    | `@dxos/app-toolkit`          | `operations/NavigationOperation.ts`                               | Resolve navigation targets      | ✓     |
| `org.dxos.operation.appToolkit.restoreText`                 | `@dxos/app-toolkit`          | `operations/CollaborationOperation.ts`                            | Restore Text                    |       |
| `org.dxos.operation.appToolkit.revertWorkspace`             | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Revert Workspace                |       |
| `org.dxos.operation.appToolkit.scrollIntoView`              | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Scroll Into View                |       |
| `org.dxos.operation.appToolkit.select`                      | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Select                          |       |
| `org.dxos.operation.appToolkit.set`                         | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Set                             |       |
| `org.dxos.operation.appToolkit.switchWorkspace`             | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Switch Workspace                |       |
| `org.dxos.operation.appToolkit.updateCompanion`             | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Update Companion                |       |
| `org.dxos.operation.appToolkit.updateComplementary`         | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Update Complementary Sidebar    |       |
| `org.dxos.operation.appToolkit.updateDialog`                | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Update Dialog                   |       |
| `org.dxos.operation.appToolkit.updatePopover`               | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Update Popover                  |       |
| `org.dxos.operation.appToolkit.updateSidebar`               | `@dxos/app-toolkit`          | `operations/LayoutOperation.ts`                                   | Update Sidebar                  |       |
| `org.dxos.operation.assistant.createChat`                   | `@dxos/plugin-assistant`     | `types/AssistantOperation.ts`                                     | Create Chat                     |       |
| `org.dxos.operation.assistant.ensureCompanionChat`          | `@dxos/plugin-assistant`     | `types/AssistantOperation.ts`                                     | Ensure Companion Chat           |       |
| `org.dxos.operation.assistant.forkChat`                     | `@dxos/plugin-assistant`     | `types/AssistantOperation.ts`                                     | Fork Chat                       |       |
| `org.dxos.operation.assistant.generateHomeSuggestions`      | `@dxos/plugin-assistant`     | `types/AssistantOperation.ts`                                     | Generate Home Suggestions       |       |
| `org.dxos.operation.assistant.setCurrentChat`               | `@dxos/plugin-assistant`     | `types/AssistantOperation.ts`                                     | Set Current Chat                |       |
| `org.dxos.operation.assistant.setTracePanelDebug`           | `@dxos/plugin-assistant`     | `types/AssistantOperation.ts`                                     | Set trace panel debug           |       |
| `org.dxos.operation.assistant.updateChatName`               | `@dxos/plugin-assistant`     | `types/AssistantOperation.ts`                                     | Update Chat Name                |       |
| `org.dxos.operation.assistantToolkit.addArtifact`           | `@dxos/assistant-toolkit`    | `skills/project/operations/definitions.ts`                        | Add project artifact            | ✓     |
| `org.dxos.operation.assistantToolkit.addContext`            | `@dxos/assistant-toolkit`    | `skills/chat-context/operations/definitions.ts`                   | Add to context                  | ✓     |
| `org.dxos.operation.assistantToolkit.createAgent`           | `@dxos/assistant-toolkit`    | `skills/agent-wizard/operations/definitions.ts`                   | Create agent                    | ✓     |
| `org.dxos.operation.assistantToolkit.delegateTask`          | `@dxos/assistant-toolkit`    | `skills/delegation/operations/definitions.ts`                     | Delegate task                   | ✓     |
| `org.dxos.operation.assistantToolkit.delete`                | `@dxos/assistant-toolkit`    | `skills/memory/operations/definitions.ts`                         | Delete memory                   | ✓     |
| `org.dxos.operation.assistantToolkit.enableSkills`          | `@dxos/assistant-toolkit`    | `skills/skill-manager/operations/definitions.ts`                  | Enable skills                   | ✓     |
| `org.dxos.operation.assistantToolkit.fetch`                 | `@dxos/assistant-toolkit`    | `skills/websearch/operations/definitions.ts`                      | Fetch web page                  | ✓     |
| `org.dxos.operation.assistantToolkit.getAgentRules`         | `@dxos/assistant-toolkit`    | `skills/agent-wizard/operations/definitions.ts`                   | Agent rules                     | ✓     |
| `org.dxos.operation.assistantToolkit.getContext`            | `@dxos/assistant-toolkit`    | `skills/agent/operations/definitions.ts`                          | Get Agent Context               |       |
| `org.dxos.operation.assistantToolkit.getCurrentDate`        | `@dxos/assistant-toolkit`    | `skills/alarm/operations/definitions.ts`                          | Get current date                | ✓     |
| `org.dxos.operation.assistantToolkit.listArtifact`          | `@dxos/assistant-toolkit`    | `skills/project/operations/definitions.ts`                        | List project artifacts          | ✓     |
| `org.dxos.operation.assistantToolkit.planReminder`          | `@dxos/assistant-toolkit`    | `skills/planning/operations/definitions.ts`                       | Plan reminder                   |       |
| `org.dxos.operation.assistantToolkit.query`                 | `@dxos/assistant-toolkit`    | `skills/memory/operations/definitions.ts`                         | Query memories                  | ✓     |
| `org.dxos.operation.assistantToolkit.querySkills`           | `@dxos/assistant-toolkit`    | `skills/skill-manager/operations/definitions.ts`                  | Query skills                    | ✓     |
| `org.dxos.operation.assistantToolkit.relay`                 | `@dxos/assistant-toolkit`    | `skills/agent/operations/definitions.ts`                          | Agent Relay                     |       |
| `org.dxos.operation.assistantToolkit.removeContext`         | `@dxos/assistant-toolkit`    | `skills/chat-context/operations/definitions.ts`                   | Remove from context             | ✓     |
| `org.dxos.operation.assistantToolkit.runInstructions`       | `@dxos/assistant-toolkit`    | `operations/definitions.ts`                                       | Run Instructions                |       |
| `org.dxos.operation.assistantToolkit.save`                  | `@dxos/assistant-toolkit`    | `skills/memory/operations/definitions.ts`                         | Save memory                     | ✓     |
| `org.dxos.operation.assistantToolkit.setAlarm`              | `@dxos/assistant-toolkit`    | `skills/alarm/operations/definitions.ts`                          | Set alarm                       | ✓     |
| `org.dxos.operation.assistantToolkit.syncTriggers`          | `@dxos/assistant-toolkit`    | `skills/agent-wizard/operations/definitions.ts`                   | Sync automation                 | ✓     |
| `org.dxos.operation.assistantToolkit.updateTasks`           | `@dxos/assistant-toolkit`    | `skills/planning/operations/definitions.ts`                       | Update tasks                    | ✓     |
| `org.dxos.operation.blogger.addPost`                        | `@dxos/plugin-blogger`       | `operations/definitions.ts`                                       | Add Post                        |       |
| `org.dxos.operation.blogger.addPublication`                 | `@dxos/plugin-blogger`       | `operations/definitions.ts`                                       | Add Publication                 |       |
| `org.dxos.operation.blogger.syncPosts`                      | `@dxos/plugin-blogger`       | `operations/definitions.ts`                                       | Sync Posts                      |       |
| `org.dxos.operation.bluesky.getTargets`                     | `@dxos/plugin-bluesky`       | `operations/definitions.ts`                                       | Get Bluesky Targets             |       |
| `org.dxos.operation.bluesky.materializeTarget`              | `@dxos/plugin-bluesky`       | `operations/definitions.ts`                                       | Materialize Bluesky Target      |       |
| `org.dxos.operation.bluesky.syncTargets`                    | `@dxos/plugin-bluesky`       | `operations/definitions.ts`                                       | Sync Bluesky                    |       |
| `org.dxos.operation.bookmarks.addFromSnapshot`              | `@dxos/plugin-bookmarks`     | `types/BookmarkOperation.ts`                                      | Add bookmark                    |       |
| `org.dxos.operation.bookmarks.summarize`                    | `@dxos/plugin-bookmarks`     | `types/BookmarkOperation.ts`                                      | Summarize Bookmark              |       |
| `org.dxos.operation.brain.analyzeMailbox`                   | `@dxos/plugin-brain`         | `types/BrainOperation.ts`                                         | Analyze Mailbox                 |       |
| `org.dxos.operation.brain.generateReply`                    | `@dxos/plugin-brain`         | `types/BrainOperation.ts`                                         | Generate Reply                  |       |
| `org.dxos.operation.brain.queryFacts`                       | `@dxos/plugin-brain`         | `types/BrainOperation.ts`                                         | Query Facts                     | ✓     |
| `org.dxos.operation.brain.summarizeSubject`                 | `@dxos/plugin-brain`         | `types/BrainOperation.ts`                                         | Summarize Subject               | ✓     |
| `org.dxos.operation.chess.move`                             | `@dxos/plugin-chess`         | `types/ChessOperation.ts`                                         | Move                            | ✓     |
| `org.dxos.operation.chess.play`                             | `@dxos/plugin-chess`         | `types/ChessOperation.ts`                                         | Play                            | ✓     |
| `org.dxos.operation.chess.print`                            | `@dxos/plugin-chess`         | `types/ChessOperation.ts`                                         | Print game                      | ✓     |
| `org.dxos.operation.chess.rebuildPositionIndex`             | `@dxos/plugin-chess`         | `types/ChessOperation.ts`                                         | Rebuild Position Index          |       |
| `org.dxos.operation.chessCom.clearSyncedGames`              | `@dxos/plugin-chess-com`     | `types/ChessComOperation.ts`                                      | Clear Synced Games              |       |
| `org.dxos.operation.chessCom.syncGames`                     | `@dxos/plugin-chess-com`     | `types/ChessComOperation.ts`                                      | Sync Games                      |       |
| `org.dxos.operation.client.createAgent`                     | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Create Agent                    |       |
| `org.dxos.operation.client.createIdentity`                  | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Create Identity                 |       |
| `org.dxos.operation.client.createPasskey`                   | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Create Passkey                  |       |
| `org.dxos.operation.client.createRecoveryCode`              | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Create Recovery Code            |       |
| `org.dxos.operation.client.grantServiceAccess`              | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Grant Service Access            |       |
| `org.dxos.operation.client.joinIdentity`                    | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Join Identity                   |       |
| `org.dxos.operation.client.openUsage`                       | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Open Usage                      |       |
| `org.dxos.operation.client.recoverIdentity`                 | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Recover Identity                |       |
| `org.dxos.operation.client.redeemPasskey`                   | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Redeem Passkey                  |       |
| `org.dxos.operation.client.redeemToken`                     | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Redeem Token                    |       |
| `org.dxos.operation.client.resetStorage`                    | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Reset Storage                   |       |
| `org.dxos.operation.client.revokeRecoveryCredential`        | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Revoke Recovery Credential      |       |
| `org.dxos.operation.client.shareIdentity`                   | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Share Identity                  |       |
| `org.dxos.operation.client.updateProfile`                   | `@dxos/plugin-client`        | `operations/definitions.ts`                                       | Update Profile                  |       |
| `org.dxos.operation.code.buildProject`                      | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Build Project                   | ✓     |
| `org.dxos.operation.code.deleteFile`                        | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Delete File                     | ✓     |
| `org.dxos.operation.code.listFiles`                         | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | List Files                      | ✓     |
| `org.dxos.operation.code.readFile`                          | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Read File                       | ✓     |
| `org.dxos.operation.code.reset`                             | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Reset Project                   | ✓     |
| `org.dxos.operation.code.runBuild`                          | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Run Build                       | ✓     |
| `org.dxos.operation.code.runBuildAgent`                     | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Run Build Agent                 | ✓     |
| `org.dxos.operation.code.scaffold`                          | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Scaffold Project                | ✓     |
| `org.dxos.operation.code.verifySpec`                        | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Verify Spec                     | ✓     |
| `org.dxos.operation.code.writeFile`                         | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Write File                      | ✓     |
| `org.dxos.operation.code.writeHelloWorld`                   | `@dxos/plugin-code`          | `types/CodeOperation.ts`                                          | Hello World                     | ✓     |
| `org.dxos.operation.commerce.analyzeProvider`               | `@dxos/plugin-commerce`      | `types/SearchOperation.ts`                                        | Analyze Provider                | ✓     |
| `org.dxos.operation.commerce.generateProviderTemplate`      | `@dxos/plugin-commerce`      | `types/SearchOperation.ts`                                        | Generate Provider Template      |       |
| `org.dxos.operation.commerce.renderPage`                    | `@dxos/plugin-commerce`      | `types/SearchOperation.ts`                                        | Render Page                     |       |
| `org.dxos.operation.commerce.runProviderSearch`             | `@dxos/plugin-commerce`      | `types/SearchOperation.ts`                                        | Run Provider Search             |       |
| `org.dxos.operation.commerce.runSearch`                     | `@dxos/plugin-commerce`      | `types/SearchOperation.ts`                                        | Run Search                      |       |
| `org.dxos.operation.commerce.setProviderTemplate`           | `@dxos/plugin-commerce`      | `types/SearchOperation.ts`                                        | Set Provider Template           | ✓     |
| `org.dxos.operation.computer.applyEdits`                    | `@dxos/plugin-computer`      | `types/ComputerOperation.ts`                                      | Edits                           | ✓     |
| `org.dxos.operation.computer.runBash`                       | `@dxos/plugin-computer`      | `types/ComputerOperation.ts`                                      | Bash                            | ✓     |
| `org.dxos.operation.connector.createConnection`             | `@dxos/plugin-connector`     | `types/ConnectorOperation.ts`                                     | Create Connection               |       |
| `org.dxos.operation.crm.attachImage`                        | `@dxos/plugin-crm`           | `types/CrmOperation.ts`                                           | Attach image                    | ✓     |
| `org.dxos.operation.crm.enrichImages`                       | `@dxos/plugin-crm`           | `types/CrmOperation.ts`                                           | Enrich images                   |       |
| `org.dxos.operation.crm.processMailbox`                     | `@dxos/plugin-crm`           | `types/CrmOperation.ts`                                           | Process mailbox                 | ✓     |
| `org.dxos.operation.crm.researchOrganization`               | `@dxos/plugin-crm`           | `types/CrmOperation.ts`                                           | Research organization           | ✓     |
| `org.dxos.operation.crm.researchPerson`                     | `@dxos/plugin-crm`           | `types/CrmOperation.ts`                                           | Research person                 | ✓     |
| `org.dxos.operation.crx.addNoteFromSnapshot`                | `@dxos/plugin-crx`           | `types/CrxOperation.ts`                                           | Add note                        |       |
| `org.dxos.operation.crx.addOrganizationFromSnapshot`        | `@dxos/plugin-crx`           | `types/CrxOperation.ts`                                           | Add organization                |       |
| `org.dxos.operation.crx.addPersonFromSnapshot`              | `@dxos/plugin-crx`           | `types/CrxOperation.ts`                                           | Add person                      |       |
| `org.dxos.operation.deck.adjust`                            | `@dxos/plugin-deck`          | `types/DeckOperation.ts`                                          | Adjust                          |       |
| `org.dxos.operation.deck.setExpose`                         | `@dxos/plugin-deck`          | `types/DeckOperation.ts`                                          | Set Exposé                      |       |
| `org.dxos.operation.deck.updatePlankSize`                   | `@dxos/plugin-deck`          | `types/DeckOperation.ts`                                          | Update Plank Size               |       |
| `org.dxos.operation.deck.updatePlankSizes`                  | `@dxos/plugin-deck`          | `types/DeckOperation.ts`                                          | Update Plank Sizes              |       |
| `org.dxos.operation.discord.crawlChannels`                  | `@dxos/plugin-discord`       | `types/DiscordOperation.ts`                                       | Crawl Discord Channels          |       |
| `org.dxos.operation.discord.getChannels`                    | `@dxos/plugin-discord`       | `types/DiscordOperation.ts`                                       | Get Discord Channels            |       |
| `org.dxos.operation.discord.materializeTarget`              | `@dxos/plugin-discord`       | `types/DiscordOperation.ts`                                       | Materialize Discord Target      |       |
| `org.dxos.operation.discord.syncChannel`                    | `@dxos/plugin-discord`       | `types/DiscordOperation.ts`                                       | Sync Discord Channel            |       |
| `org.dxos.operation.doctor.queryComposerLogs`               | `@dxos/plugin-doctor`        | `types/DoctorOperation.ts`                                        | Query Composer Logs             | ✓     |
| `org.dxos.operation.file.create`                            | `@dxos/plugin-file`          | `types/FileOperation.ts`                                          | Create File                     |       |
| `org.dxos.operation.file.read`                              | `@dxos/plugin-file`          | `types/FileOperation.ts`                                          | Read File                       | ✓     |
| `org.dxos.operation.fileSystem.closeDirectory`              | `@dxos/plugin-file-system`   | `types/FileSystemOperation.ts`                                    | Close Folder                    |       |
| `org.dxos.operation.fileSystem.openDirectory`               | `@dxos/plugin-file-system`   | `types/FileSystemOperation.ts`                                    | Open Folder                     |       |
| `org.dxos.operation.fileSystem.refreshDirectory`            | `@dxos/plugin-file-system`   | `types/FileSystemOperation.ts`                                    | Refresh Folder                  |       |
| `org.dxos.operation.github.getRepositories`                 | `@dxos/plugin-github`        | `types/GitHubOperation.ts`                                        | Get GitHub Repositories         |       |
| `org.dxos.operation.github.materializeTarget`               | `@dxos/plugin-github`        | `types/GitHubOperation.ts`                                        | Materialize GitHub Target       |       |
| `org.dxos.operation.github.syncRepositories`                | `@dxos/plugin-github`        | `types/GitHubOperation.ts`                                        | Sync GitHub Repositories        |       |
| `org.dxos.operation.google.createCalendarEvent`             | `@dxos/plugin-google`        | `types/GoogleOperation.ts`                                        | Create Google Calendar Event    |       |
| `org.dxos.operation.google.getCalendars`                    | `@dxos/plugin-google`        | `types/GoogleOperation.ts`                                        | Get Google Calendars            |       |
| `org.dxos.operation.google.getContactGroups`                | `@dxos/plugin-google`        | `types/GoogleOperation.ts`                                        | Get Google Contact Groups       |       |
| `org.dxos.operation.google.materializeCalendarTarget`       | `@dxos/plugin-google`        | `types/GoogleOperation.ts`                                        | Materialize Calendar Target     |       |
| `org.dxos.operation.google.materializeGmailTarget`          | `@dxos/plugin-google`        | `types/GoogleOperation.ts`                                        | Materialize Gmail Target        |       |
| `org.dxos.operation.google.sendMail`                        | `@dxos/plugin-google`        | `types/GoogleOperation.ts`                                        | Send Gmail                      |       |
| `org.dxos.operation.google.syncCalendar`                    | `@dxos/plugin-google`        | `types/GoogleOperation.ts`                                        | Sync Google Calendar            |       |
| `org.dxos.operation.google.syncContacts`                    | `@dxos/plugin-google`        | `types/GoogleOperation.ts`                                        | Sync Google Contacts            |       |
| `org.dxos.operation.google.syncMail`                        | `@dxos/plugin-google`        | `types/GoogleOperation.ts`                                        | Sync Google Mail                |       |
| `org.dxos.operation.ibkr.getInstrumentFundamentals`         | `@dxos/plugin-ibkr`          | `types/IbkrOperation.ts`                                          | Get instrument fundamentals     | ✓     |
| `org.dxos.operation.ibkr.getPortfolio`                      | `@dxos/plugin-ibkr`          | `types/IbkrOperation.ts`                                          | Get IBKR portfolio              | ✓     |
| `org.dxos.operation.ibkr.getTrades`                         | `@dxos/plugin-ibkr`          | `types/IbkrOperation.ts`                                          | Get IBKR trades                 | ✓     |
| `org.dxos.operation.ibkr.importPortfolioReport`             | `@dxos/plugin-ibkr`          | `types/IbkrOperation.ts`                                          | Import IBKR report              |       |
| `org.dxos.operation.ibkr.materializeInstrument`             | `@dxos/plugin-ibkr`          | `types/IbkrOperation.ts`                                          | Materialize instrument          | ✓     |
| `org.dxos.operation.ibkr.syncLots`                          | `@dxos/plugin-ibkr`          | `types/IbkrOperation.ts`                                          | Sync IBKR lots                  |       |
| `org.dxos.operation.ibkr.syncPortfolioReport`               | `@dxos/plugin-ibkr`          | `types/IbkrOperation.ts`                                          | Sync IBKR portfolio             | ✓     |
| `org.dxos.operation.illustrator.create`                     | `@dxos/plugin-illustrator`   | `types/DrawingOperation.ts`                                       | Create Drawing                  | ✓     |
| `org.dxos.operation.illustrator.edit`                       | `@dxos/plugin-illustrator`   | `types/DrawingOperation.ts`                                       | Edit Drawing                    | ✓     |
| `org.dxos.operation.illustrator.generate`                   | `@dxos/plugin-illustrator`   | `types/DrawingOperation.ts`                                       | Generate Drawing                | ✓     |
| `org.dxos.operation.illustrator.read`                       | `@dxos/plugin-illustrator`   | `types/DrawingOperation.ts`                                       | Read Drawing                    | ✓     |
| `org.dxos.operation.inbox.addMailbox`                       | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Add Mailbox                     |       |
| `org.dxos.operation.inbox.analyzeMailbox`                   | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Analyze Mailbox                 |       |
| `org.dxos.operation.inbox.classifyEmail`                    | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Classify email                  | ✓     |
| `org.dxos.operation.inbox.classifyMailbox`                  | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Classify Mailbox                |       |
| `org.dxos.operation.inbox.createProjectFromMessage`         | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Create Project                  |       |
| `org.dxos.operation.inbox.draftEmail`                       | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Draft email                     | ✓     |
| `org.dxos.operation.inbox.draftEmailAndOpen`                | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Draft email and open            |       |
| `org.dxos.operation.inbox.extractContact`                   | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Extract Contact                 |       |
| `org.dxos.operation.inbox.extractContactFromMessage`        | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Extract Contact from Message    |       |
| `org.dxos.operation.inbox.extractCorrespondents`            | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Extract Correspondents          |       |
| `org.dxos.operation.inbox.extractMailbox`                   | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Extract Mailbox                 |       |
| `org.dxos.operation.inbox.extractMessage`                   | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Extract Message                 | ✓     |
| `org.dxos.operation.inbox.extractSubscriptions`             | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Extract Subscriptions           |       |
| `org.dxos.operation.inbox.extractSummaryFromMessage`        | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Extract Summary from Message    |       |
| `org.dxos.operation.inbox.readEmail`                        | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Read email                      | ✓     |
| `org.dxos.operation.inbox.renameFilter`                     | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Rename Filter                   |       |
| `org.dxos.operation.inbox.resetFeedCursor`                  | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Reset Feed Cursor               |       |
| `org.dxos.operation.inbox.summarizeMailbox`                 | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Summarize Mailbox               |       |
| `org.dxos.operation.inbox.unsubscribeSender`                | `@dxos/plugin-inbox`         | `types/InboxOperation.ts`                                         | Unsubscribe                     |       |
| `org.dxos.operation.jmap.materializeTarget`                 | `@dxos/plugin-jmap`          | `types/JmapOperation.ts`                                          | Materialize JMAP Target         |       |
| `org.dxos.operation.jmap.send`                              | `@dxos/plugin-jmap`          | `types/JmapOperation.ts`                                          | Send JMAP                       |       |
| `org.dxos.operation.jmap.sync`                              | `@dxos/plugin-jmap`          | `types/JmapOperation.ts`                                          | Sync JMAP                       |       |
| `org.dxos.operation.kanban.deleteCard`                      | `@dxos/plugin-kanban`        | `types/KanbanOperation.ts`                                        | Delete Card                     |       |
| `org.dxos.operation.kanban.deleteCardField`                 | `@dxos/plugin-kanban`        | `types/KanbanOperation.ts`                                        | Delete Card Field               |       |
| `org.dxos.operation.kanban.restoreCard`                     | `@dxos/plugin-kanban`        | `types/KanbanOperation.ts`                                        | Restore Card                    |       |
| `org.dxos.operation.kanban.restoreCardField`                | `@dxos/plugin-kanban`        | `types/KanbanOperation.ts`                                        | Restore Card Field              |       |
| `org.dxos.operation.linear.getTeams`                        | `@dxos/plugin-linear`        | `types/LinearOperation.ts`                                        | Get Linear Teams                |       |
| `org.dxos.operation.linear.materializeTarget`               | `@dxos/plugin-linear`        | `types/LinearOperation.ts`                                        | Materialize Linear Target       |       |
| `org.dxos.operation.linear.syncTeams`                       | `@dxos/plugin-linear`        | `types/LinearOperation.ts`                                        | Sync Linear Teams               |       |
| `org.dxos.operation.lingo.addWord`                          | `@dxos/plugin-lingo`         | `types/LingoOperation.ts`                                         | Add word                        |       |
| `org.dxos.operation.lingo.analyzeText`                      | `@dxos/plugin-lingo`         | `types/LingoOperation.ts`                                         | Analyze text                    |       |
| `org.dxos.operation.lingo.extractVocabulary`                | `@dxos/plugin-lingo`         | `types/LingoOperation.ts`                                         | Extract vocabulary              |       |
| `org.dxos.operation.lingo.recordReview`                     | `@dxos/plugin-lingo`         | `types/LingoOperation.ts`                                         | Record review                   |       |
| `org.dxos.operation.lingo.translatePassage`                 | `@dxos/plugin-lingo`         | `types/LingoOperation.ts`                                         | Translate passage               |       |
| `org.dxos.operation.lingo.translateTerm`                    | `@dxos/plugin-lingo`         | `types/LingoOperation.ts`                                         | Translate term                  |       |
| `org.dxos.operation.magazine.clear`                         | `@dxos/plugin-magazine`      | `types/FeedOperation.ts`                                          | Clear Magazine                  |       |
| `org.dxos.operation.magazine.curate`                        | `@dxos/plugin-magazine`      | `types/FeedOperation.ts`                                          | Curate Magazine                 |       |
| `org.dxos.operation.magazine.fetchArticleContent`           | `@dxos/plugin-magazine`      | `types/FeedOperation.ts`                                          | Fetch Article Content           | ✓     |
| `org.dxos.operation.magazine.loadPostContent`               | `@dxos/plugin-magazine`      | `types/FeedOperation.ts`                                          | Load Post Content               |       |
| `org.dxos.operation.magazine.syncFeed`                      | `@dxos/plugin-magazine`      | `types/FeedOperation.ts`                                          | Sync Feed                       |       |
| `org.dxos.operation.map.setControlType`                     | `@dxos/plugin-map`           | `types/MapOperation.ts`                                           | Set Map Control Type            |       |
| `org.dxos.operation.markdown.create`                        | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Create                          | ✓     |
| `org.dxos.operation.markdown.createBranch`                  | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Create Branch                   | ✓     |
| `org.dxos.operation.markdown.createCheckpoint`              | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Create Checkpoint               | ✓     |
| `org.dxos.operation.markdown.createDraft`                   | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Draft Markdown Document         |       |
| `org.dxos.operation.markdown.getHistory`                    | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Get History                     |       |
| `org.dxos.operation.markdown.getSelection`                  | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Get Selection                   | ✓     |
| `org.dxos.operation.markdown.mergeBranch`                   | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Merge Branch                    | ✓     |
| `org.dxos.operation.markdown.open`                          | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Open                            | ✓     |
| `org.dxos.operation.markdown.scrollToAnchor`                | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Scroll To Anchor                |       |
| `org.dxos.operation.markdown.suggestEdit`                   | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Suggest Edit                    |       |
| `org.dxos.operation.markdown.update`                        | `@dxos/plugin-markdown`      | `types/MarkdownOperation.ts`                                      | Update                          | ✓     |
| `org.dxos.operation.meeting.create`                         | `@dxos/plugin-meeting`       | `types/MeetingOperation.ts`                                       | Create Meeting                  |       |
| `org.dxos.operation.meeting.handlePayload`                  | `@dxos/plugin-meeting`       | `types/MeetingOperation.ts`                                       | Handle Meeting Payload          |       |
| `org.dxos.operation.meeting.setActive`                      | `@dxos/plugin-meeting`       | `types/MeetingOperation.ts`                                       | Set Active Meeting              |       |
| `org.dxos.operation.meeting.summarize`                      | `@dxos/plugin-meeting`       | `types/MeetingOperation.ts`                                       | Summarize Meeting               |       |
| `org.dxos.operation.observability.sendEvent`                | `@dxos/plugin-observability` | `types/ObservabilityOperation.ts`                                 | Send Event                      |       |
| `org.dxos.operation.observability.setEnabled`               | `@dxos/plugin-observability` | `types/ObservabilityOperation.ts`                                 | Set Observability Enabled       |       |
| `org.dxos.operation.onboarding.completeOAuthRegistration`   | `@dxos/plugin-onboarding`    | `operations/definitions.ts`                                       | Complete OAuth Registration     |       |
| `org.dxos.operation.onboarding.importExemplarSpace`         | `@dxos/plugin-onboarding`    | `operations/definitions.ts`                                       | Import Exemplar Space           |       |
| `org.dxos.operation.onboarding.redeemOAuthRecovery`         | `@dxos/plugin-onboarding`    | `operations/definitions.ts`                                       | Redeem OAuth Recovery           |       |
| `org.dxos.operation.onboarding.registerOAuthRecovery`       | `@dxos/plugin-onboarding`    | `operations/definitions.ts`                                       | Register OAuth Recovery         |       |
| `org.dxos.operation.presenter.setPresenting`                | `@dxos/plugin-presenter`     | `types/PresenterOperation.ts`                                     | Set Presenting                  |       |
| `org.dxos.operation.projects.create`                        | `@dxos/plugin-projects`      | `types/ProjectOperation.ts`                                       | Create Project                  | ✓     |
| `org.dxos.operation.projects.createChat`                    | `@dxos/plugin-projects`      | `types/ProjectOperation.ts`                                       | Create Project Chat             |       |
| `org.dxos.operation.projects.createTracking`                | `@dxos/plugin-projects`      | `types/ProjectOperation.ts`                                       | Create Tracking Project         |       |
| `org.dxos.operation.projects.get`                           | `@dxos/plugin-projects`      | `types/ProjectMcpOperation.ts`                                    | Get Project                     | ✓     |
| `org.dxos.operation.projects.list`                          | `@dxos/plugin-projects`      | `types/ProjectMcpOperation.ts`                                    | List Projects                   | ✓     |
| `org.dxos.operation.projects.update`                        | `@dxos/plugin-projects`      | `types/ProjectMcpOperation.ts`                                    | Update Project                  | ✓     |
| `org.dxos.operation.projects.updateInvestorLog`             | `@dxos/plugin-projects`      | `types/ProjectOperation.ts`                                       | Update Investor Log             |       |
| `org.dxos.operation.projects.updateTasks`                   | `@dxos/plugin-projects`      | `types/ProjectOperation.ts`                                       | Update Project Tasks            |       |
| `org.dxos.operation.projects.updateTravelLog`               | `@dxos/plugin-projects`      | `types/ProjectOperation.ts`                                       | Update Travel Log               |       |
| `org.dxos.operation.registry.queryPlugins`                  | `@dxos/plugin-registry`      | `operations/definitions.ts`                                       | Query Plugins                   | ✓     |
| `org.dxos.operation.review.addMessage`                      | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Add Comment                     |       |
| `org.dxos.operation.review.create`                          | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Create Comment Thread           |       |
| `org.dxos.operation.review.createProposals`                 | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Create Proposals                | ✓     |
| `org.dxos.operation.review.delete`                          | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Delete Comment Thread           |       |
| `org.dxos.operation.review.deleteMessage`                   | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Delete Comment                  |       |
| `org.dxos.operation.review.respondToThread`                 | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Respond to Comment Thread       |       |
| `org.dxos.operation.review.restore`                         | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Restore Comment Thread          |       |
| `org.dxos.operation.review.restoreMessage`                  | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Restore Comment                 |       |
| `org.dxos.operation.review.select`                          | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Select Comment Thread           |       |
| `org.dxos.operation.review.setAgentConfig`                  | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Set Agent Config                |       |
| `org.dxos.operation.review.setResolved`                     | `@dxos/plugin-review`        | `types/CommentOperation.ts`                                       | Set Resolved                    |       |
| `org.dxos.operation.routine.createAutomation`               | `@dxos/plugin-routine`       | `types/RoutineOperation.ts`                                       | Create Routine                  |       |
| `org.dxos.operation.routine.createTriggerFromTemplate`      | `@dxos/plugin-routine`       | `types/RoutineOperation.ts`                                       | Create Trigger From Template    |       |
| `org.dxos.operation.routine.runAutomation`                  | `@dxos/plugin-routine`       | `types/RoutineOperation.ts`                                       | Run Routine                     |       |
| `org.dxos.operation.routine.runPromptInNewChat`             | `@dxos/plugin-routine`       | `types/RoutineOperation.ts`                                       | Run Prompt In New Chat          |       |
| `org.dxos.operation.sample.createItem`                      | `@dxos/plugin-sample`        | `types/SampleOperation.ts`                                        | Create Sample Item              |       |
| `org.dxos.operation.sample.randomize`                       | `@dxos/plugin-sample`        | `types/SampleOperation.ts`                                        | Randomize Sample Item           |       |
| `org.dxos.operation.sample.updateStatus`                    | `@dxos/plugin-sample`        | `types/SampleOperation.ts`                                        | Update Status                   |       |
| `org.dxos.operation.sandbox.create`                         | `@dxos/plugin-sandbox`       | `skills/functions/definitions.ts`                                 | CreateSandbox                   | ✓     |
| `org.dxos.operation.sandbox.downloadFile`                   | `@dxos/plugin-sandbox`       | `skills/functions/definitions.ts`                                 | DownloadFile                    | ✓     |
| `org.dxos.operation.sandbox.exec`                           | `@dxos/plugin-sandbox`       | `skills/functions/definitions.ts`                                 | Exec                            | ✓     |
| `org.dxos.operation.sandbox.uploadFile`                     | `@dxos/plugin-sandbox`       | `skills/functions/definitions.ts`                                 | UploadFile                      | ✓     |
| `org.dxos.operation.script.create`                          | `@dxos/plugin-script`        | `types/ScriptOperation.ts`                                        | Create Script                   |       |
| `org.dxos.operation.script.createFunction`                  | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | Create                          | ✓     |
| `org.dxos.operation.script.delete`                          | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | Delete                          | ✓     |
| `org.dxos.operation.script.deploy`                          | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | Deploy                          | ✓     |
| `org.dxos.operation.script.inspectInvocations`              | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | InspectInvocations              | ✓     |
| `org.dxos.operation.script.install`                         | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | InstallFunction                 | ✓     |
| `org.dxos.operation.script.invoke`                          | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | Invoke                          | ✓     |
| `org.dxos.operation.script.queryDeployed`                   | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | QueryDeployedFunctions          | ✓     |
| `org.dxos.operation.script.read`                            | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | Read                            | ✓     |
| `org.dxos.operation.script.update`                          | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | Update                          | ✓     |
| `org.dxos.operation.search.open`                            | `@dxos/plugin-search`        | `types/SearchOperation.ts`                                        | Open Search                     |       |
| `org.dxos.operation.sequencer.read`                         | `@dxos/plugin-sequencer`     | `types/ScoreOperation.ts`                                         | Read score                      | ✓     |
| `org.dxos.operation.sequencer.write`                        | `@dxos/plugin-sequencer`     | `types/ScoreOperation.ts`                                         | Write score                     | ✓     |
| `org.dxos.operation.sheet.create`                           | `@dxos/plugin-sheet`         | `types/SheetOperation.ts`                                         | Create                          | ✓     |
| `org.dxos.operation.sheet.dropAxis`                         | `@dxos/plugin-sheet`         | `types/SheetOperation.ts`                                         | Drop Axis                       |       |
| `org.dxos.operation.sheet.getRange`                         | `@dxos/plugin-sheet`         | `types/SheetOperation.ts`                                         | Get Range Values                | ✓     |
| `org.dxos.operation.sheet.insertAxis`                       | `@dxos/plugin-sheet`         | `types/SheetOperation.ts`                                         | Insert Axis                     |       |
| `org.dxos.operation.sheet.restoreAxis`                      | `@dxos/plugin-sheet`         | `types/SheetOperation.ts`                                         | Restore Axis                    |       |
| `org.dxos.operation.sheet.scrollToAnchor`                   | `@dxos/plugin-sheet`         | `types/SheetOperation.ts`                                         | Scroll To Anchor                |       |
| `org.dxos.operation.sheet.setRange`                         | `@dxos/plugin-sheet`         | `types/SheetOperation.ts`                                         | Set Range Values                | ✓     |
| `org.dxos.operation.slack.getChannels`                      | `@dxos/plugin-slack`         | `types/SlackOperation.ts`                                         | Get Slack Channels              |       |
| `org.dxos.operation.slack.materializeTarget`                | `@dxos/plugin-slack`         | `types/SlackOperation.ts`                                         | Materialize Slack Target        |       |
| `org.dxos.operation.slack.syncChannel`                      | `@dxos/plugin-slack`         | `types/SlackOperation.ts`                                         | Sync Slack Channel              |       |
| `org.dxos.operation.space.addObject`                        | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Add Object                      | ✓     |
| `org.dxos.operation.space.addRelation`                      | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Add Relation                    | ✓     |
| `org.dxos.operation.space.addTag`                           | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Add Tag                         | ✓     |
| `org.dxos.operation.space.addType`                          | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Add Type                        | ✓     |
| `org.dxos.operation.space.close`                            | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Close Space                     |       |
| `org.dxos.operation.space.collectGarbage`                   | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Collect Garbage                 |       |
| `org.dxos.operation.space.create`                           | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Create Space                    |       |
| `org.dxos.operation.space.createCollection`                 | `@dxos/plugin-space`         | `types/CollectionOperation.ts`                                    | Create Collection               |       |
| `org.dxos.operation.space.delete`                           | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Delete Space                    |       |
| `org.dxos.operation.space.deleteField`                      | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Delete Field                    |       |
| `org.dxos.operation.space.duplicateObject`                  | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Duplicate Object                |       |
| `org.dxos.operation.space.export`                           | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Export Space                    |       |
| `org.dxos.operation.space.findDuplicates`                   | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Find Duplicates                 |       |
| `org.dxos.operation.space.getObjects`                       | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Get Objects                     | ✓     |
| `org.dxos.operation.space.getShareLink`                     | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Get Share Link                  |       |
| `org.dxos.operation.space.import`                           | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Import Space                    |       |
| `org.dxos.operation.space.join`                             | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Join Space                      |       |
| `org.dxos.operation.space.mergeDuplicates`                  | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Merge Duplicates                |       |
| `org.dxos.operation.space.migrate`                          | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Migrate Space                   |       |
| `org.dxos.operation.space.open`                             | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Open Space                      |       |
| `org.dxos.operation.space.openCreate`                       | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Open Create Space Dialog        |       |
| `org.dxos.operation.space.openImport`                       | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Open Import Space Dialog        |       |
| `org.dxos.operation.space.openMembers`                      | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Open Members                    |       |
| `org.dxos.operation.space.openObjectForm`                   | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Open Object Form                |       |
| `org.dxos.operation.space.openSettings`                     | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Open Space Settings             |       |
| `org.dxos.operation.space.queryObjects`                     | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Query Objects                   | ✓     |
| `org.dxos.operation.space.queryTypes`                       | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Query Types                     | ✓     |
| `org.dxos.operation.space.removeAllObjects`                 | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Remove All Objects              |       |
| `org.dxos.operation.space.removeObjects`                    | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Remove Objects                  | ✓     |
| `org.dxos.operation.space.removeTag`                        | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Remove Tag                      | ✓     |
| `org.dxos.operation.space.rename`                           | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Rename Space                    |       |
| `org.dxos.operation.space.renameObject`                     | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Rename Object                   |       |
| `org.dxos.operation.space.restoreField`                     | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Restore Field                   |       |
| `org.dxos.operation.space.restoreObjects`                   | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Restore Objects                 |       |
| `org.dxos.operation.space.share`                            | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Share Space                     |       |
| `org.dxos.operation.space.snapshot`                         | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Create Snapshot                 |       |
| `org.dxos.operation.space.updateObject`                     | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Update Object                   | ✓     |
| `org.dxos.operation.space.waitForObject`                    | `@dxos/plugin-space`         | `types/SpaceOperation.ts`                                         | Wait For Object                 |       |
| `org.dxos.operation.studio.generate`                        | `@dxos/plugin-studio`        | `types/StudioOperation.ts`                                        | Generate                        |       |
| `org.dxos.operation.support.captureFeedback`                | `@dxos/plugin-support`       | `types/SupportOperation.ts`                                       | Capture User Feedback           |       |
| `org.dxos.operation.support.createTicket`                   | `@dxos/plugin-support`       | `types/SupportOperation.ts`                                       | Create Support Ticket           | ✓     |
| `org.dxos.operation.support.hideWelcome`                    | `@dxos/plugin-support`       | `types/HelpOperation.ts`                                          | Hide Welcome                    |       |
| `org.dxos.operation.support.markInProgress`                 | `@dxos/plugin-support`       | `types/SupportOperation.ts`                                       | Mark Support Ticket In Progress | ✓     |
| `org.dxos.operation.support.resolveTicket`                  | `@dxos/plugin-support`       | `types/SupportOperation.ts`                                       | Resolve Support Ticket          | ✓     |
| `org.dxos.operation.support.searchDocs`                     | `@dxos/plugin-support`       | `types/SupportOperation.ts`                                       | Search Documentation            | ✓     |
| `org.dxos.operation.support.startWelcomeTour`               | `@dxos/plugin-support`       | `types/HelpOperation.ts`                                          | Start welcome tour              |       |
| `org.dxos.operation.table.addRow`                           | `@dxos/plugin-table`         | `types/TableOperation.ts`                                         | Add Row                         |       |
| `org.dxos.operation.table.create`                           | `@dxos/plugin-table`         | `types/TableOperation.ts`                                         | Create Table                    |       |
| `org.dxos.operation.table.exportRows`                       | `@dxos/plugin-table`         | `types/TableOperation.ts`                                         | Export Rows                     |       |
| `org.dxos.operation.table.handleTypeAdded`                  | `@dxos/plugin-table`         | `types/TableOperation.ts`                                         | On Type Added                   |       |
| `org.dxos.operation.tasks.appendJournalEntry`               | `@dxos/plugin-tasks`         | `types/OutlineOperation.ts`                                       | Quick Journal Entry             |       |
| `org.dxos.operation.tasks.assign`                           | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Assign Task                     | ✓     |
| `org.dxos.operation.tasks.complete`                         | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Complete Task                   | ✓     |
| `org.dxos.operation.tasks.convert`                          | `@dxos/plugin-tasks`         | `types/OutlineOperation.ts`                                       | Convert to Task                 |       |
| `org.dxos.operation.tasks.create`                           | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Create Task                     | ✓     |
| `org.dxos.operation.tasks.createMilestone`                  | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Create Milestone                | ✓     |
| `org.dxos.operation.tasks.createOutline`                    | `@dxos/plugin-tasks`         | `types/OutlineOperation.ts`                                       | Create Outline                  |       |
| `org.dxos.operation.tasks.delete`                           | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Delete Task                     |       |
| `org.dxos.operation.tasks.deleteMilestone`                  | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Delete Milestone                | ✓     |
| `org.dxos.operation.tasks.getOutline`                       | `@dxos/plugin-tasks`         | `types/OutlineOperation.ts`                                       | Get Outline                     | ✓     |
| `org.dxos.operation.tasks.list`                             | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | List Tasks                      | ✓     |
| `org.dxos.operation.tasks.listMilestone`                    | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | List Milestones                 | ✓     |
| `org.dxos.operation.tasks.move`                             | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Move Task                       |       |
| `org.dxos.operation.tasks.moveMilestone`                    | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Move Milestone                  | ✓     |
| `org.dxos.operation.tasks.update`                           | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Update Task                     | ✓     |
| `org.dxos.operation.tasks.updateMilestone`                  | `@dxos/plugin-tasks`         | `types/TaskOperation.ts`                                          | Update Milestone                | ✓     |
| `org.dxos.operation.tasks.updateOutline`                    | `@dxos/plugin-tasks`         | `types/OutlineOperation.ts`                                       | Update Outline                  | ✓     |
| `org.dxos.operation.thread.appendChannelMessage`            | `@dxos/plugin-thread`        | `types/ThreadOperation.ts`                                        | Append Channel Message          |       |
| `org.dxos.operation.thread.createChannel`                   | `@dxos/plugin-thread`        | `types/ThreadOperation.ts`                                        | Create Channel                  |       |
| `org.dxos.operation.transcription.create`                   | `@dxos/plugin-transcription` | `types/TranscriptOperation.ts`                                    | Create Transcript               |       |
| `org.dxos.operation.transcription.enrichMessage`            | `@dxos/plugin-transcription` | `types/TranscriptOperation.ts`                                    | Enrich Transcript Message       |       |
| `org.dxos.operation.transcription.normalizeSentence`        | `@dxos/plugin-transcription` | `types/TranscriptOperation.ts`                                    | Sentence Normalization          |       |
| `org.dxos.operation.transcription.open`                     | `@dxos/plugin-transcription` | `types/TranscriptOperation.ts`                                    | Open                            | ✓     |
| `org.dxos.operation.transcription.summarize`                | `@dxos/plugin-transcription` | `types/TranscriptOperation.ts`                                    | Summarize                       | ✓     |
| `org.dxos.operation.trello.getBoards`                       | `@dxos/plugin-trello`        | `types/TrelloOperation.ts`                                        | Get Trello Boards               |       |
| `org.dxos.operation.trello.materializeTarget`               | `@dxos/plugin-trello`        | `types/TrelloOperation.ts`                                        | Materialize Trello Target       |       |
| `org.dxos.operation.trello.syncBoard`                       | `@dxos/plugin-trello`        | `types/TrelloOperation.ts`                                        | Sync Trello Board               |       |
| `org.dxos.operation.trip.addSegment`                        | `@dxos/plugin-trip`          | `types/TripOperation.ts`                                          | Add segment                     | ✓     |
| `org.dxos.operation.trip.createFromEvents`                  | `@dxos/plugin-trip`          | `types/TripOperation.ts`                                          | Create trip from events         |       |
| `org.dxos.operation.trip.extract`                           | `@dxos/plugin-trip`          | `types/TripOperation.ts`                                          | Extract Trip                    |       |
| `org.dxos.operation.trip.merge`                             | `@dxos/plugin-trip`          | `types/TripOperation.ts`                                          | Merge trip                      |       |
| `org.dxos.operation.trip.planRoute`                         | `@dxos/plugin-trip`          | `types/RoutingOperation.ts`                                       | Plan route                      | ✓     |
| `org.dxos.operation.trip.searchBookings`                    | `@dxos/plugin-trip`          | `types/BookingOperation.ts`                                       | Search Bookings                 | ✓     |
| `org.dxos.operation.video.fetchDescription`                 | `@dxos/plugin-video`         | `types/VideoOperation.ts`                                         | Fetch Video Description         |       |
| `org.dxos.operation.video.fetchTranscript`                  | `@dxos/plugin-video`         | `types/VideoOperation.ts`                                         | Fetch Video Transcript          |       |
| `org.dxos.operation.video.summarize`                        | `@dxos/plugin-video`         | `types/VideoOperation.ts`                                         | Summarize Video                 |       |
| `org.dxos.operation.video.transcribe`                       | `@dxos/plugin-video`         | `types/VideoOperation.ts`                                         | Transcribe Video                |       |
| `org.dxos.operation.voxel.add`                              | `@dxos/plugin-voxel`         | `types/VoxelOperation.ts`                                         | Add voxels                      | ✓     |
| `org.dxos.operation.voxel.generateShape`                    | `@dxos/plugin-voxel`         | `types/VoxelOperation.ts`                                         | Generate shape                  | ✓     |
| `org.dxos.operation.voxel.queryWorld`                       | `@dxos/plugin-voxel`         | `types/VoxelOperation.ts`                                         | Query world                     | ✓     |
| `org.dxos.operation.voxel.remove`                           | `@dxos/plugin-voxel`         | `types/VoxelOperation.ts`                                         | Remove voxels                   | ✓     |
| `com.example.operation.appToolkit.log`                      | `@dxos/app-toolkit`          | `playground/logger/schema.ts`                                     | Log                             |       |
| `com.example.operation.binding.sync`                        | `@dxos/plugin-connector`     | `Binding.test.ts`                                                 | Test Sync                       |       |
| `com.example.operation.compute.create`                      | `@dxos/compute`              | `Operation.test.ts`                                               | Something Else Entirely         |       |
| `com.example.operation.countReplies`                        | `@dxos/agent-runtime`        | `functions.test.ts`                                               | Count Replies                   | ✓     |
| `com.example.operation.delegatedWork`                       | `@dxos/agent-runtime`        | `agent-service/AgentService.test.ts`                              | Delegated work                  |       |
| `com.example.operation.delegatedWork`                       | `@dxos/agent-runtime`        | `agent-service/delegation-scripted.test.ts`                       | Delegated work                  |       |
| `com.example.operation.deployed`                            | `@dxos/compute-runtime`      | `protocol.test.ts`                                                | Deployed                        |       |
| `com.example.operation.example.myFunction`                  | `@dxos/plugin-script`        | `skills/functions/definitions.ts`                                 | My Function                     |       |
| `com.example.operation.fib`                                 | `@dxos/functions-testing`    | `functions/definitions.ts`                                        | Fibonacci                       |       |
| `com.example.operation.fib`                                 | `@dxos/compute`              | `testing/definitions.ts`                                          | Fibonacci                       |       |
| `com.example.operation.fn.taskCreate`                       | `@dxos/mcp-server`           | `internal/input.test.ts`                                          | Create Task                     | ✓     |
| `com.example.operation.inbox.testing.stub`                  | `@dxos/plugin-inbox`         | `operations/analyze/analyze-mailbox.test.ts`                      | Stub                            |       |
| `com.example.operation.local`                               | `@dxos/compute-runtime`      | `protocol.test.ts`                                                | Local                           |       |
| `com.example.operation.organizationList`                    | `@dxos/agent-runtime`        | `assistant-session-tests/format.test.ts`                          | Organization List               |       |
| `com.example.operation.query`                               | `@dxos/functions-testing`    | `functions/definitions.ts`                                        | Query                           |       |
| `com.example.operation.random`                              | `@dxos/cli`                  | `util/test-toolkit.ts`                                            | random                          |       |
| `com.example.operation.readName`                            | `@dxos/agent-runtime`        | `functions.test.ts`                                               | Read Name                       | ✓     |
| `com.example.operation.registry.queryPlugins`               | `@dxos/mcp-server`           | `McpServer.test.ts`                                               | Query Plugins                   |       |
| `com.example.operation.reply`                               | `@dxos/functions-testing`    | `functions/definitions.ts`                                        | Reply                           |       |
| `com.example.operation.reply`                               | `@dxos/compute`              | `testing/definitions.ts`                                          | Reply                           |       |
| `com.example.operation.research`                            | `@dxos/agent-runtime`        | `agent-service/AgentService.test.ts`                              | Research                        | ✓     |
| `com.example.operation.scheduler`                           | `@dxos/compute-runtime`      | `protocol.test.ts`                                                | Scheduler                       |       |
| `com.example.operation.script.anthropic`                    | `@dxos/plugin-script`        | `templates/anthropic.ts`                                          | Anthropic Chat                  |       |
| `com.example.operation.script.chessBot`                     | `@dxos/plugin-script`        | `templates/chess-bot.ts`                                          | Chess Bot                       |       |
| `com.example.operation.script.commentary`                   | `@dxos/plugin-script`        | `templates/commentary.ts`                                         | Commentary                      |       |
| `com.example.operation.script.forex`                        | `@dxos/plugin-script`        | `templates/forex.ts`                                              | Forex                           |       |
| `com.example.operation.script.forexEffect`                  | `@dxos/functions-testing`    | `functions/forex-effect.ts`                                       | Forex Effect                    |       |
| `com.example.operation.script.forexEffect`                  | `@dxos/plugin-script`        | `templates/forex-effect.ts`                                       | Forex Effect                    |       |
| `com.example.operation.script.ping`                         | `@dxos/plugin-script`        | `templates/ping.ts`                                               | Ping                            |       |
| `com.example.operation.sleep`                               | `@dxos/functions-testing`    | `functions/definitions.ts`                                        | Sleep                           |       |
| `com.example.operation.sleep`                               | `@dxos/compute`              | `testing/definitions.ts`                                          | Sleep                           |       |
| `com.example.operation.space.archive`                       | `@dxos/mcp-server`           | `McpServer.test.ts`                                               | Archive Space                   |       |
| `com.example.operation.space.queryObjects`                  | `@dxos/mcp-server`           | `McpServer.test.ts`                                               | Query Objects                   |       |
| `com.example.operation.space.removeObjects`                 | `@dxos/mcp-server`           | `McpServer.test.ts`                                               | Remove Objects                  |       |
| `com.example.operation.storiesBrain.retrieveSnippets`       | `@dxos/stories-brain`        | `testing/harness/skills/rag-skill.ts`                             | Retrieve Snippets               | ✓     |
| `com.example.operation.storiesBrain.retrieveSubject`        | `@dxos/stories-brain`        | `testing/harness/skills/hybrid-skill.ts`                          | Retrieve Subject                | ✓     |
| `com.example.operation.test.add`                            | `@dxos/operation`            | `invoker.test.ts`                                                 | —                               |       |
| `com.example.operation.test.add`                            | `@dxos/app-framework`        | `plugin-process-manager/testing.ts`                               | —                               |       |
| `com.example.operation.test.async`                          | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.asyncHandler`                   | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.bindingLifecycle.sync`          | `@dxos/plugin-connector`     | `Binding.test.ts`                                                 | Test Sync                       |       |
| `com.example.operation.test.childPassthrough`               | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | ChildPassthrough                |       |
| `com.example.operation.test.compute`                        | `@dxos/operation`            | `invoker.test.ts`                                                 | —                               |       |
| `com.example.operation.test.compute`                        | `@dxos/app-framework`        | `plugin-process-manager/testing.ts`                               | —                               |       |
| `com.example.operation.test.compute.add`                    | `@dxos/compute-hyperformula` | `compute-graph-registry.test.ts`                                  | add                             |       |
| `com.example.operation.test.connectorAuth.sync`             | `@dxos/plugin-connector`     | `ConnectorAuth.test.ts`                                           | Test Sync                       |       |
| `com.example.operation.test.connectorAuthGraph.sync`        | `@dxos/plugin-connector`     | `capabilities/connector-auth-actions.test.ts`                     | Test Sync                       |       |
| `com.example.operation.test.count`                          | `@dxos/operation`            | `scheduler.test.ts`                                               | —                               |       |
| `com.example.operation.test.createSingleCursor.materialize` | `@dxos/plugin-connector`     | `capabilities/connector-coordinator/create-single-cursor.test.ts` | —                               |       |
| `com.example.operation.test.createSingleCursor.sync`        | `@dxos/plugin-connector`     | `capabilities/connector-coordinator/create-single-cursor.test.ts` | —                               |       |
| `com.example.operation.test.declaredService`                | `@dxos/operation`            | `invoker.test.ts`                                                 | —                               |       |
| `com.example.operation.test.default`                        | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.deployed`                       | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.deployedDouble`                 | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | DeployedDouble                  |       |
| `com.example.operation.test.double`                         | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | Double                          |       |
| `com.example.operation.test.fail`                           | `@dxos/operation`            | `invoker.test.ts`                                                 | —                               |       |
| `com.example.operation.test.failing`                        | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | Failing                         |       |
| `com.example.operation.test.halveCompute`                   | `@dxos/app-framework`        | `plugin-process-manager/testing.ts`                               | —                               |       |
| `com.example.operation.test.invoker.child`                  | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | Child                           |       |
| `com.example.operation.test.invoker.parent`                 | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | Parent                          |       |
| `com.example.operation.test.materializeExampleTarget`       | `@dxos/plugin-connector`     | `capabilities/connector-coordinator/reconcile-cursors.test.ts`    | —                               |       |
| `com.example.operation.test.mixed`                          | `@dxos/assistant`            | `tool-runtime/services.test.ts`                                   | —                               |       |
| `com.example.operation.test.noParams`                       | `@dxos/assistant`            | `tool-runtime/services.test.ts`                                   | —                               |       |
| `com.example.operation.test.notDeployed`                    | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | NotDeployed                     |       |
| `com.example.operation.test.pageAction`                     | `@dxos/plugin-crx`           | `page-actions.test.ts`                                            | Test                            |       |
| `com.example.operation.test.parentInvoker`                  | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | ParentInvoker                   |       |
| `com.example.operation.test.pipeable`                       | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.propertyBag`                    | `@dxos/assistant`            | `tool-runtime/services.test.ts`                                   | —                               |       |
| `com.example.operation.test.reconcileCursors.sync`          | `@dxos/plugin-connector`     | `capabilities/connector-coordinator/reconcile-cursors.test.ts`    | —                               |       |
| `com.example.operation.test.recursive`                      | `@dxos/assistant`            | `tool-runtime/services.test.ts`                                   | —                               |       |
| `com.example.operation.test.rename`                         | `@dxos/plugin-observability` | `capabilities/invocation-listener.test.ts`                        | —                               |       |
| `com.example.operation.test.runAgain`                       | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | RunAgain                        |       |
| `com.example.operation.test.runnable`                       | `@dxos/plugin-routine`       | `operations/run-routine.test.ts`                                  | Test Runnable                   |       |
| `com.example.operation.test.services`                       | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.sideEffect`                     | `@dxos/operation`            | `scheduler.test.ts`                                               | —                               |       |
| `com.example.operation.test.sideEffect`                     | `@dxos/operation`            | `invoker.test.ts`                                                 | —                               |       |
| `com.example.operation.test.sideEffect`                     | `@dxos/app-framework`        | `plugin-process-manager/testing.ts`                               | —                               |       |
| `com.example.operation.test.slowChild`                      | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | SlowChild                       |       |
| `com.example.operation.test.slowIdempotent`                 | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | SlowIdempotent                  |       |
| `com.example.operation.test.slowNonIdempotent`              | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | SlowNonIdempotent               |       |
| `com.example.operation.test.sync`                           | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.sync`                           | `@dxos/plugin-connector`     | `Binding.test.ts`                                                 | Test Sync                       |       |
| `com.example.operation.test.syncFanout.sync`                | `@dxos/plugin-connector`     | `Binding.test.ts`                                                 | Test Sync                       |       |
| `com.example.operation.test.syncTemplate.sync`              | `@dxos/plugin-connector`     | `SyncTemplate.test.ts`                                            | Test Sync                       |       |
| `com.example.operation.test.targetConnectors.sync`          | `@dxos/plugin-connector`     | `types/ConnectorSpec.test.ts`                                     | Test Sync                       |       |
| `com.example.operation.test.toString`                       | `@dxos/operation`            | `invoker.test.ts`                                                 | —                               |       |
| `com.example.operation.test.toString`                       | `@dxos/app-framework`        | `plugin-process-manager/testing.ts`                               | —                               |       |
| `com.example.operation.test.triggerWithFollowup`            | `@dxos/operation`            | `scheduler.test.ts`                                               | —                               |       |
| `com.example.operation.test.typeError`                      | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.types`                          | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.untracked`                      | `@dxos/plugin-observability` | `capabilities/invocation-listener.test.ts`                        | —                               |       |
| `com.example.operation.test.withLiveRef`                    | `@dxos/compute-runtime`      | `ProcessManager.test.ts`                                          | WithLiveRef                     |       |
| `com.example.operation.test.withServices`                   | `@dxos/operation`            | `operation.test.ts`                                               | —                               |       |
| `com.example.operation.test.write`                          | `@dxos/operation`            | `invoker.test.ts`                                                 | —                               |       |
| `com.example.operation.triggerDispatcher.probeDatabase`     | `@dxos/compute-runtime`      | `triggers/trigger-dispatcher.test.ts`                             | Probe Database                  |       |
| `com.example.operation.triggerDispatcher.retry`             | `@dxos/compute-runtime`      | `triggers/trigger-dispatcher.test.ts`                             | Retry                           |       |
| `com.example.operation.triggerDispatcher.subjectProbe`      | `@dxos/compute-runtime`      | `triggers/trigger-dispatcher.test.ts`                             | Subject Probe                   |       |
