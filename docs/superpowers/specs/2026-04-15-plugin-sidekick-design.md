# Plugin Sidekick — Design Specification

## Overview

A companion agent plugin for DXOS Composer that acts as a personal sidekick — monitoring activity, maintaining profiles of people and the user, keeping a journal, and helping manage communications. The agent is document-aware, workflow-aware, and agent-aware.

## Architecture

Three layers:

1. **Plugin layer** (`SidekickPlugin.tsx`) — registers metadata, surfaces, translations. Provides a Dashboard Article surface for managing the agent. Registers the Sidekick Blueprint.
2. **Blueprint layer** (`sidekick-blueprint.ts`) — composes existing blueprints (database, agent, markdown, inbox, inbox-send) and provides a Template with the agent's instructions, personality, and behavioral rules.
3. **Dashboard surface** — Article view showing day-ahead summary, action items, person profile cards, user profile summary, and permission toggles. Chat companion provides the primary interaction channel with voice input.

## Data Types (all pre-existing)

| Type | Typename | Role |
|---|---|---|
| `Agent.Agent` | `org.dxos.type.agent` | The sidekick itself. `spec` holds instructions, `chat` for conversation, `queue` for events, `artifacts` for managed documents |
| `Person` | `org.dxos.type.person` | People the agent tracks. Tagged with meta categories |
| `Text.Text` | (system) | Profile documents (one per Person + one for User), agent instructions |
| `Journal` | `org.dxos.type.journal` | Daily journal tracking decisions, conversations, actions |
| `JournalEntry` | `org.dxos.type.journalEntry` | Per-day entries with markdown task lists |
| `Chat.Chat` | `org.dxos.type.assistant.chat` | Primary interaction channel |
| `Message.Message` | (system) | Chat messages including voice-transcribed input |
| `Tag` | (system) | Person categorization |
| `Feed.Feed` | `org.dxos.type.feed` | Backing store for Chat messages |

## Relationships

- Agent → Person Profile documents (via `artifacts` array + `relation-create`)
- Agent → User Profile document (via `artifacts` + `relation-create`)
- Agent → Journal (via `artifacts`)
- Person → Profile document (relation link, discoverable via related objects)
- Person → Tag (friend / colleague / customer / investor / family)

## Existing Operations Used

### Database Blueprint (`org.dxos.blueprint.database`)
- `Query` — find Person objects, tags, documents in space
- `Load` — read object content by reference
- `ObjectCreate` — create new objects
- `ObjectUpdate` — update object properties
- `ObjectDelete` — delete objects
- `TagAdd` / `TagRemove` — categorize Person objects
- `RelationCreate` / `RelationDelete` — link profiles to people
- `ContextAdd` / `ContextRemove` — manage chat context

### Agent Blueprint (`org.dxos.blueprint.agent`)
- `AddArtifact` — register managed documents as agent artifacts

### Markdown Blueprint (`org.dxos.blueprint.markdown`)
- `Create` — create profile and journal documents
- `Open` — read document content
- `Update` — edit documents with structured changes

### Inbox Blueprint (`org.dxos.blueprint.inbox`)
- `ReadEmail` — read mailbox contents
- `ClassifyEmail` — tag/classify incoming email
- `SummarizeMailbox` — generate email summaries
- `DraftEmail` — create draft email responses

### Inbox Send Blueprint (`org.dxos.blueprint.inbox-send`)
- `GmailSend` — send emails (gated by user permission)

## No New Operations in Phase 1

All sidekick behavior is achieved by composing existing operations via the Blueprint's instruction template. The agent chains operations as needed (e.g., Query persons → Create markdown → RelationCreate → AddArtifact to create a linked profile).

## Blueprint Design

### Composed Blueprints
- `org.dxos.blueprint.database`
- `org.dxos.blueprint.agent`
- `org.dxos.blueprint.markdown`
- `org.dxos.blueprint.inbox`
- `org.dxos.blueprint.inbox-send`

### Instruction Template

The agent's `spec` document contains a Template with the following structure:

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

Template inputs: `userName` (from identity profile), space context objects.

## Dashboard Article Surface

The `SidekickArticle` surface is displayed for Agent.Agent objects whose blueprint matches `org.dxos.blueprint.sidekick`. The surface filter checks this via the agent's bound blueprint key.

### Layout

```
┌─────────────────────────────────────────┐
│ Sidekick Dashboard                      │
├─────────────────────────────────────────┤
│ Day Ahead                               │
│ ┌─────────────────────────────────────┐ │
│ │ Summary from today's JournalEntry   │ │
│ │ - Action items due today            │ │
│ │ - Scheduled meetings                │ │
│ │ - Email requiring attention         │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Action Items                            │
│ ┌─────────────────────────────────────┐ │
│ │ □ Reply to Alice re: proposal       │ │
│ │ □ Review Bob's document             │ │
│ │ ☑ Send meeting notes to Carol       │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ People                                  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ │ Alice   │ │ Bob     │ │ Carol   │   │
│ │ colleague│ │ investor│ │ friend  │   │
│ │ ★ 3 new │ │         │ │ ★ 1 new │   │
│ └─────────┘ └─────────┘ └─────────┘   │
├─────────────────────────────────────────┤
│ Your Profile                            │
│ ┌─────────────────────────────────────┐ │
│ │ Goals summary / state of mind       │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Permissions                             │
│ ┌─────────────────────────────────────┐ │
│ │ Auto-respond: [Alice ✓] [Bob ✗]    │ │
│ │ Draft-only:   [Carol ✓]            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

Companion panel: Chat with voice input
```

### Sections
1. **Day Ahead** — reads today's JournalEntry, summarizes upcoming items.
2. **Action Items** — aggregated task list from recent JournalEntries.
3. **People** — grid of Person cards with tag badges and notification counts for profile updates.
4. **Your Profile** — summary excerpt from the user's profile document.
5. **Permissions** — toggles for which contacts the agent can auto-respond to or draft messages for.

## Voice Input

Voice input is provided by the existing Chat companion component, which integrates `useVoiceInput` from `@dxos/plugin-transcription`. This uses a Whisper backend service for transcription. No additional voice implementation is needed in the Sidekick plugin.

## Plugin File Structure

```
plugin-sidekick/
├── PLUGIN.mdl                    # MDL specification
├── README.md
├── package.json                  # private: true, #imports aliases
├── moon.yml                      # compile entry points
├── src/
│   ├── index.ts                  # exports meta + SidekickPlugin
│   ├── meta.ts                   # Plugin.Meta (id, name, icon, hue)
│   ├── SidekickPlugin.tsx        # Plugin.define(meta).pipe(...)
│   ├── translations.ts           # i18n resources
│   ├── types/
│   │   ├── index.ts              # namespace export
│   │   └── Sidekick.ts           # SidekickProperties type (if needed)
│   ├── blueprints/
│   │   ├── index.ts              # barrel export
│   │   └── sidekick-blueprint.ts # Blueprint.make() composing existing blueprints
│   ├── capabilities/
│   │   ├── index.ts              # Capability.lazy() exports
│   │   ├── react-surface.tsx     # Surface for SidekickArticle
│   │   └── blueprint-definition.ts
│   ├── components/
│   │   ├── index.ts              # barrel
│   │   ├── DayAhead/             # day summary component
│   │   ├── ActionItems/          # task list component
│   │   ├── PeopleGrid/           # person cards with tags
│   │   ├── ProfileSummary/       # user profile excerpt
│   │   └── Permissions/          # auto-respond toggles
│   └── containers/
│       ├── index.ts              # lazy exports
│       └── SidekickArticle/
│           ├── index.ts
│           ├── SidekickArticle.tsx
│           └── SidekickArticle.stories.tsx
```

## Phased Rollout

### Phase 1 — Core Functionality
- Plugin skeleton (meta, translations, blueprint registration)
- Sidekick Blueprint with instruction template composing existing operations
- Agent creation and configuration (spec, chat, journal, artifacts)
- Person profile creation and linking
- User profile document creation
- Journal with daily entries
- SidekickArticle dashboard (day ahead, action items, people grid, profile summary)
- Voice input via Chat companion (already functional)

### Phase 2 — Suggested Next Steps (after Phase 1 is validated)
- Email monitoring and draft generation for authorized contacts
- Permission system for auto-respond vs draft-only per contact
- Background research on persons (web search via research blueprint)
- Proactive suggestions based on email/calendar context
- Thread comment responses in markdown documents
- Periodic user assessment and goal tracking refinement

### Phase 3 — Future Research
- Local ML transcription via plugin-transformer (offline capability)
- Calendar integration for day-ahead enrichment
- Multi-space awareness (cross-space person deduplication)
- Agent-to-agent communication (sidekick delegates to specialized agents)
- Data migration tooling for schema evolution
- Custom operations if composite chaining proves insufficient

## Migration Strategy

Since this is experimental and types may change:
- All data is stored in existing ECHO types (no custom schemas to migrate).
- Agent behavior is entirely in the instruction template — changes require only updating the `spec` document.
- If underlying system types change, profile documents (markdown) are portable. Relations and tags may need re-creation.
- Phase 3 includes data migration tooling if structural changes are needed.
