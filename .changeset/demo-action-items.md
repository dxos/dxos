---
'@dxos/plugin-inbox': minor
'@dxos/plugin-discord': minor
'@dxos/plugin-projects': minor
'@dxos/plugin-canvas': patch
'@dxos/plugin-code': patch
'@dxos/plugin-space': patch
'@dxos/app-toolkit': patch
---

Spec-driven templates, a generated DXOS wiki, and demo-ready inbox, Discord and transcription flows.

- Inbox: mailbox summaries link the people and organizations they mention as object chips; a new "Analyze New Mail" routine template analyzes mail as it arrives; Analyze is available on mailboxes with no connection.
- Discord: a show-and-tell curator files links and attachments posted in a curated channel as `ShowAndTell.Entry` rows and answers "what did we do this week?"; `EnableShowAndTell` switches it on.
- Projects: the Composer Plugin template bundles the plugin's `PLUGIN.mdl` so the registry can open its spec, and a new World Clock space template seeds the project, spec and features.
- Code: the spec viewer reads every block in an `mdl` fence and draws dotted feature ids as a tree; Canvas now bundles its spec.
- Space templates can name the plugins they need (`SpaceTemplate.plugins`); applying one enables any that are installed but off. The DXOS Architecture template now seeds a wiki generated from the repository's specs.
