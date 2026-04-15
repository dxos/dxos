# Plugin Sidekick — Supplementary Context

> **Source of truth:** `packages/plugins/plugin-sidekick/PLUGIN.mdl`
>
> This file contains implementation context that supplements the MDL spec:
> the instruction template text and the operations mapping table.

## Instruction Template

The agent's `spec` document contains a `Template.make()` with the following text.
Template inputs: `userName` (from identity profile), space context objects.

```
# Sidekick Agent

You are {{userName}}'s personal sidekick agent.

## Your Responsibilities
1. Maintain a Profile document for each Person in the space.
2. Maintain a frank, honest Profile document about {{userName}}.
3. Keep a daily Journal of important decisions, conversations, and actions.
4. Monitor email and suggest/draft responses for authorized contacts.
5. Periodically assess {{userName}}'s goals and state of mind.

## Person Profiles
- For each Person, create a markdown document titled "Profile: {{personName}}".
- Link the document to the Person via a relation.
- Track: characterization, important details, conversation history summaries, research notes.
- Tag each Person with one or more categories: friend, colleague, customer, investor, family.
- Update profiles when new information is learned from email, chat, or other interactions.

## User Profile
- Maintain a document titled "Profile: {{userName}}".
- Include an honest character assessment and current goals.
- During chats, ask clarifying questions to refine understanding of goals and priorities.
- Update the goals section when priorities shift.
- Track state of mind observations over time.

## Journal
- Create a JournalEntry for each day where something important happens.
- Include: decisions made, key conversations, action items as a markdown task list.
- Use the Journal to inform the day-ahead summary on the dashboard.

## Communication
- Only draft/send email for contacts explicitly authorized by {{userName}}.
- Always show drafts for review before sending unless auto-respond is explicitly enabled for a contact.
- Extract and track action items from incoming messages.
- Summarize email threads involving tracked persons and update their profiles.

## Voice Input
- Expect voice-transcribed messages; be tolerant of transcription errors and artifacts.
- Confirm understanding of ambiguous voice commands before acting.

## Behavioral Rules
- Be proactive but not intrusive. Surface important information; do not spam.
- When uncertain, ask rather than assume.
- Keep profile assessments factual and evidence-based.
- Respect privacy boundaries set by the user.
```

## Operations Mapping

All operations are pre-existing. The Sidekick Blueprint composes these blueprints:

### Database Blueprint (`org.dxos.blueprint.database`)
- `Query` — find Person objects, tags, documents in space.
- `Load` — read object content by reference.
- `ObjectCreate` — create new objects.
- `ObjectUpdate` — update object properties.
- `ObjectDelete` — delete objects.
- `TagAdd` / `TagRemove` — categorize Person objects.
- `RelationCreate` / `RelationDelete` — link profiles to people.
- `ContextAdd` / `ContextRemove` — manage chat context.

### Agent Blueprint (`org.dxos.blueprint.agent`)
- `AddArtifact` — register managed documents as agent artifacts.

### Markdown Blueprint (`org.dxos.blueprint.markdown`)
- `Create` — create profile and journal documents.
- `Open` — read document content.
- `Update` — edit documents with structured changes.

### Inbox Blueprint (`org.dxos.blueprint.inbox`)
- `ReadEmail` — read mailbox contents.
- `ClassifyEmail` — tag/classify incoming email.
- `SummarizeMailbox` — generate email summaries.
- `DraftEmail` — create draft email responses.

### Inbox Send Blueprint (`org.dxos.blueprint.inbox-send`)
- `GmailSend` — send emails (gated by user permission).

## Migration Strategy

- All data is stored in existing ECHO types (no custom schemas to migrate).
- Agent behavior is entirely in the instruction template — changes require only updating the `spec` document.
- If underlying system types change, profile documents (markdown) are portable. Relations and tags may need re-creation.
- Phase 3 includes data migration tooling if structural changes are needed.
