# Plugin Sidekick Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal companion agent plugin that maintains people profiles, a user profile, a daily journal, and a dashboard — all driven by composing existing DXOS blueprints and operations.

**Architecture:** Single plugin with three layers — plugin registration (types, metadata, surfaces, translations), a Sidekick Blueprint that composes existing database/agent/markdown/inbox blueprints with a custom instruction template, and a Dashboard Article surface showing day-ahead summary, profiles, action items, and permissions.

**Tech Stack:** TypeScript, Effect Schema, React, TailwindCSS, DXOS app-framework / app-toolkit / echo / blueprints / operation.

**Spec:** `packages/plugins/plugin-sidekick/PLUGIN.mdl`
**Supplementary context:** `docs/superpowers/specs/2026-04-15-plugin-sidekick-design.md`

---

## File Structure

```
packages/plugins/plugin-sidekick/
├── PLUGIN.mdl                          # (exists) specification
├── README.md                           # brief description
├── package.json                        # private: true, #imports, exports
├── moon.yml                            # compile entry points
├── src/
│   ├── index.ts                        # exports meta + SidekickPlugin
│   ├── meta.ts                         # Plugin.Meta
│   ├── SidekickPlugin.tsx              # Plugin.define(meta).pipe(...)
│   ├── translations.ts                 # i18n resources
│   ├── types/
│   │   ├── index.ts                    # namespace export: export * as Sidekick from './schema'
│   │   └── schema.ts                   # Profile + SidekickProperties types
│   ├── blueprints/
│   │   ├── index.ts                    # barrel: export { default as SidekickBlueprint } from './sidekick-blueprint'
│   │   └── sidekick-blueprint.ts       # Blueprint.make() with instruction template
│   ├── capabilities/
│   │   ├── index.ts                    # Capability.lazy() exports
│   │   ├── react-surface.tsx           # Surface for SidekickArticle
│   │   └── blueprint-definition.ts     # BlueprintDefinition capability
│   ├── components/
│   │   ├── index.ts                    # barrel
│   │   ├── DayAhead.tsx                # day summary section
│   │   ├── ActionItems.tsx             # task list section
│   │   ├── ProfileGrid.tsx             # profile cards grid
│   │   ├── ProfileSummary.tsx          # user profile excerpt
│   │   └── Permissions.tsx             # per-profile permission toggles
│   └── containers/
│       ├── index.ts                    # lazy(() => import('./SidekickArticle'))
│       └── SidekickArticle/
│           ├── index.ts                # default export bridge
│           └── SidekickArticle.tsx      # main dashboard container
```

---

### Task 1: Package scaffold (package.json, moon.yml, README)

**Files:**
- Create: `packages/plugins/plugin-sidekick/package.json`
- Create: `packages/plugins/plugin-sidekick/moon.yml`
- Create: `packages/plugins/plugin-sidekick/README.md`
- Modify: `pnpm-workspace.yaml` (no change needed — `packages/**/*` glob already covers it)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@dxos/plugin-sidekick",
  "version": "0.8.3",
  "private": true,
  "description": "Personal companion agent plugin",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "MIT",
  "author": "DXOS.org",
  "sideEffects": true,
  "type": "module",
  "imports": {
    "#blueprints": "./src/blueprints/index.ts",
    "#capabilities": "./src/capabilities/index.ts",
    "#components": "./src/components/index.ts",
    "#containers": "./src/containers/index.ts",
    "#meta": "./src/meta.ts",
    "#types": "./src/types/index.ts"
  },
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs"
    },
    "./types": {
      "source": "./src/types/index.ts",
      "types": "./dist/types/src/types/index.d.ts",
      "browser": "./dist/lib/browser/types/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "typesVersions": {
    "*": {
      "types": [
        "dist/types/src/types/index.d.ts"
      ]
    }
  },
  "files": [
    "dist",
    "src"
  ],
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/assistant-toolkit": "workspace:*",
    "@dxos/blueprints": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/invariant": "workspace:*",
    "@dxos/operation": "workspace:*",
    "@dxos/plugin-outliner": "workspace:*",
    "@dxos/plugin-space": "workspace:*",
    "@dxos/react-client": "workspace:*",
    "@dxos/types": "workspace:*",
    "@dxos/util": "workspace:*",
    "effect": "catalog:"
  },
  "devDependencies": {
    "@dxos/react-ui": "workspace:*",
    "@dxos/storybook-utils": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "vite": "catalog:"
  },
  "peerDependencies": {
    "@dxos/react-ui": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

- [ ] **Step 2: Create moon.yml**

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - pack
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/types/index.ts'
```

- [ ] **Step 3: Create README.md**

```markdown
# Plugin Sidekick

Personal companion agent plugin for DXOS Composer. Monitors activity, maintains profiles of people and the user, keeps a daily journal, and helps manage communications.

See `PLUGIN.mdl` for the full specification.
```

- [ ] **Step 4: Install dependencies**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-sidekick && CI=true pnpm install`
Expected: dependencies resolved, lockfile updated.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-sidekick/package.json packages/plugins/plugin-sidekick/moon.yml packages/plugins/plugin-sidekick/README.md pnpm-lock.yaml
git commit -m "feat(plugin-sidekick): add package scaffold"
```

---

### Task 2: Types (Profile, SidekickProperties)

**Files:**
- Create: `packages/plugins/plugin-sidekick/src/types/schema.ts`
- Create: `packages/plugins/plugin-sidekick/src/types/index.ts`

- [ ] **Step 1: Create schema.ts with Profile and SidekickProperties types**

File: `packages/plugins/plugin-sidekick/src/types/schema.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';

export namespace Sidekick {
  export const Profile = Schema.Struct({
    subject: Ref.Ref(Obj.Unknown),
    document: Ref.Ref(Obj.Unknown),
    autoRespond: Schema.optional(Schema.Boolean),
    createDraft: Schema.optional(Schema.Boolean),
    researchEnabled: Schema.optional(Schema.Boolean),
    lastUpdated: Schema.optional(Schema.String),
  }).pipe(
    Type.object({
      typename: 'org.dxos.type.sidekick.profile',
      version: '0.1.0',
    }),
    Annotation.IconAnnotation.set({
      icon: 'ph--user-circle--regular',
      hue: 'cyan',
    }),
  );

  export type Profile = Schema.Schema.Type<typeof Profile>;

  export const Properties = Schema.Struct({
    journalEnabled: Schema.optional(Schema.Boolean),
  }).pipe(
    Type.object({
      typename: 'org.dxos.type.sidekick.properties',
      version: '0.1.0',
    }),
    Annotation.IconAnnotation.set({
      icon: 'ph--brain--regular',
      hue: 'violet',
    }),
  );

  export type Properties = Schema.Schema.Type<typeof Properties>;

  export const makeProfile = (props: {
    subject: Ref.Ref<Obj.Unknown>;
    document: Ref.Ref<Obj.Unknown>;
  }) =>
    Obj.make(Profile, {
      subject: props.subject,
      document: props.document,
      autoRespond: false,
      createDraft: false,
      researchEnabled: false,
      lastUpdated: new Date().toISOString(),
    });
}
```

Note: The `SidekickProperties.profiles` map from the spec will be managed via the Agent's `artifacts` array and ECHO relations rather than a separate Record field. This avoids complex nested ref structures. Each Profile object links to its subject via the `subject` ref, and the agent tracks all Profile objects as artifacts.

- [ ] **Step 2: Create types/index.ts**

File: `packages/plugins/plugin-sidekick/src/types/index.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

export { Sidekick } from './schema';
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-sidekick && moon run plugin-sidekick:build`
Expected: Build succeeds (there may be no output yet since index.ts doesn't exist — that's fine, we just want no errors in the types).

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-sidekick/src/types/
git commit -m "feat(plugin-sidekick): add Profile and Properties types"
```

---

### Task 3: Meta, translations, and index

**Files:**
- Create: `packages/plugins/plugin-sidekick/src/meta.ts`
- Create: `packages/plugins/plugin-sidekick/src/translations.ts`
- Create: `packages/plugins/plugin-sidekick/src/index.ts`

- [ ] **Step 1: Create meta.ts**

File: `packages/plugins/plugin-sidekick/src/meta.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.sidekick',
  name: 'Sidekick',
  description: trim`
    Personal companion agent that monitors activity, maintains profiles of people
    and the user, keeps a daily journal, and helps manage communications.
  `,
  icon: 'ph--brain--regular',
  iconHue: 'violet',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sidekick',
};
```

- [ ] **Step 2: Create translations.ts**

File: `packages/plugins/plugin-sidekick/src/translations.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Sidekick } from '#types';

export const translations = [
  {
    'en-US': {
      [Sidekick.Profile.typename]: {
        'typename.label': 'Profile',
        'typename.label_zero': 'Profiles',
        'typename.label_one': 'Profile',
        'typename.label_other': 'Profiles',
        'object-name.placeholder': 'New profile',
      },
      [Sidekick.Properties.typename]: {
        'typename.label': 'Sidekick Properties',
      },
      [meta.id]: {
        'plugin.name': 'Sidekick',
        'dashboard.title': 'Sidekick Dashboard',
        'day-ahead.title': 'Day Ahead',
        'action-items.title': 'Action Items',
        'profiles.title': 'People',
        'user-profile.title': 'Your Profile',
        'permissions.title': 'Permissions',
        'auto-respond.label': 'Auto-respond',
        'create-draft.label': 'Create draft',
        'research.label': 'Research',
        'no-entry.label': 'No journal entry for today.',
        'no-profiles.label': 'No profiles yet.',
        'no-action-items.label': 'No action items.',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 3: Create index.ts**

File: `packages/plugins/plugin-sidekick/src/index.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './meta';
export * from './SidekickPlugin';
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-sidekick/src/meta.ts packages/plugins/plugin-sidekick/src/translations.ts packages/plugins/plugin-sidekick/src/index.ts
git commit -m "feat(plugin-sidekick): add meta, translations, and index"
```

---

### Task 4: Sidekick Blueprint

**Files:**
- Create: `packages/plugins/plugin-sidekick/src/blueprints/sidekick-blueprint.ts`
- Create: `packages/plugins/plugin-sidekick/src/blueprints/index.ts`

Reference files for patterns:
- `packages/plugins/plugin-chess/src/blueprints/chess-blueprint.ts`
- `packages/core/assistant-toolkit/src/blueprints/database/blueprint.ts`
- `docs/superpowers/specs/2026-04-15-plugin-sidekick-design.md` (instruction template)

- [ ] **Step 1: Create sidekick-blueprint.ts**

File: `packages/plugins/plugin-sidekick/src/blueprints/sidekick-blueprint.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

const BLUEPRINT_KEY = 'org.dxos.blueprint.sidekick';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Sidekick',
    description: 'Personal companion agent that maintains profiles, journals, and manages communications.',
    agentCanEnable: true,
    instructions: Template.make({
      source: trim`
        # Sidekick Agent

        You are a personal sidekick agent.

        ## Your Responsibilities
        1. Maintain a Profile document for each Person in the space.
        2. Maintain a frank, honest Profile document about the user.
        3. Keep a daily Journal of important decisions, conversations, and actions.
        4. Monitor email and suggest/draft responses for authorized contacts.
        5. Periodically assess the user's goals and state of mind.

        ## Person Profiles
        - For each Person, create a markdown document titled "Profile: {personName}".
        - Link the document to the Person via a relation.
        - Track: characterization, important details, conversation history summaries, research notes.
        - Tag each Person with one or more categories: friend, colleague, customer, investor, family.
        - Update profiles when new information is learned from email, chat, or other interactions.

        ## User Profile
        - Maintain a document titled "Profile: {userName}" for the user.
        - Include an honest character assessment and current goals.
        - During chats, ask clarifying questions to refine understanding of goals and priorities.
        - Update the goals section when priorities shift.
        - Track state of mind observations over time.

        ## Journal
        - Create a JournalEntry for each day where something important happens.
        - Include: decisions made, key conversations, action items as a markdown task list.
        - Use the Journal to inform the day-ahead summary on the dashboard.

        ## Communication
        - Only draft/send email for contacts explicitly authorized by the user.
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
      `,
      inputs: [
        {
          name: 'agent',
          kind: 'function',
          function: 'org.dxos.function.agent.get-context',
        },
      ],
    }),
    tools: Blueprint.toolDefinitions({ operations: [] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
```

Note: The `tools` array is empty because all operations come from composed blueprints (database, agent, markdown, inbox) which are enabled on the Agent.Agent object separately. The sidekick blueprint provides the instructions and identity; the operational tooling comes from standard DXOS blueprints already available in the system.

- [ ] **Step 2: Create blueprints/index.ts**

File: `packages/plugins/plugin-sidekick/src/blueprints/index.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

export { default as SidekickBlueprint } from './sidekick-blueprint';
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-sidekick/src/blueprints/
git commit -m "feat(plugin-sidekick): add Sidekick blueprint with instruction template"
```

---

### Task 5: Capabilities (blueprint-definition, react-surface)

**Files:**
- Create: `packages/plugins/plugin-sidekick/src/capabilities/blueprint-definition.ts`
- Create: `packages/plugins/plugin-sidekick/src/capabilities/react-surface.tsx`
- Create: `packages/plugins/plugin-sidekick/src/capabilities/index.ts`

Reference: `packages/plugins/plugin-chess/src/capabilities/blueprint-definition.ts`

- [ ] **Step 1: Create blueprint-definition.ts**

File: `packages/plugins/plugin-sidekick/src/capabilities/blueprint-definition.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { SidekickBlueprint } from '#blueprints';

const blueprintDefinition = Capability.makeModule<
  [],
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
>(() => Effect.succeed([Capability.contributes(AppCapabilities.BlueprintDefinition, SidekickBlueprint)]));

export default blueprintDefinition;
```

- [ ] **Step 2: Create react-surface.tsx**

File: `packages/plugins/plugin-sidekick/src/capabilities/react-surface.tsx`

The surface needs to match Agent.Agent objects that have the sidekick blueprint bound. We check for Agent type and filter appropriately.

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { lazy } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Agent } from '@dxos/assistant-toolkit/types';

const SidekickArticle = lazy(() => import('#containers'));

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'sidekick-dashboard',
        role: 'article',
        filter: AppSurface.objectArticle(Agent.Agent),
        component: ({ data, role }) => (
          <SidekickArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ),
  ),
);
```

Note: This registers a surface for ALL Agent.Agent objects in the article role. If this conflicts with existing Agent surfaces (e.g., from plugin-assistant), we may need to add filtering logic. For Phase 1, this is sufficient since the sidekick dashboard provides a useful view for any agent. If needed, we can add a filter that checks the agent's blueprint binding later.

- [ ] **Step 3: Create capabilities/index.ts**

File: `packages/plugins/plugin-sidekick/src/capabilities/index.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-sidekick/src/capabilities/
git commit -m "feat(plugin-sidekick): add blueprint-definition and react-surface capabilities"
```

---

### Task 6: Dashboard components (primitives)

**Files:**
- Create: `packages/plugins/plugin-sidekick/src/components/DayAhead.tsx`
- Create: `packages/plugins/plugin-sidekick/src/components/ActionItems.tsx`
- Create: `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx`
- Create: `packages/plugins/plugin-sidekick/src/components/ProfileSummary.tsx`
- Create: `packages/plugins/plugin-sidekick/src/components/Permissions.tsx`
- Create: `packages/plugins/plugin-sidekick/src/components/index.ts`

Important: Components must NOT import from `@dxos/app-framework` or `@dxos/app-toolkit`. They receive data as props.

- [ ] **Step 1: Create DayAhead.tsx**

File: `packages/plugins/plugin-sidekick/src/components/DayAhead.tsx`

```typescript
//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type DayAheadProps = {
  summary?: string;
  classNames?: string;
};

export const DayAhead = ({ summary, classNames }: DayAheadProps) => {
  return (
    <div className={classNames}>
      {summary ? (
        <p className='text-sm text-description whitespace-pre-wrap'>{summary}</p>
      ) : (
        <p className='text-sm text-description italic'>No journal entry for today.</p>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create ActionItems.tsx**

File: `packages/plugins/plugin-sidekick/src/components/ActionItems.tsx`

```typescript
//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type ActionItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type ActionItemsProps = {
  items: ActionItem[];
  onToggle?: (item: ActionItem) => void;
  classNames?: string;
};

export const ActionItems = ({ items, onToggle, classNames }: ActionItemsProps) => {
  if (items.length === 0) {
    return (
      <div className={classNames}>
        <p className='text-sm text-description italic'>No action items.</p>
      </div>
    );
  }

  return (
    <div className={classNames}>
      <ul className='space-y-1'>
        {items.map((item) => (
          <li key={item.id} className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={item.completed}
              onChange={() => onToggle?.(item)}
              className='shrink-0'
            />
            <span className={item.completed ? 'line-through text-description' : ''}>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

- [ ] **Step 3: Create ProfileGrid.tsx**

File: `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx`

```typescript
//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type ProfileCardData = {
  id: string;
  name: string;
  tag?: string;
  updatedCount?: number;
};

export type ProfileGridProps = {
  profiles: ProfileCardData[];
  onSelect?: (profileId: string) => void;
  classNames?: string;
};

export const ProfileGrid = ({ profiles, onSelect, classNames }: ProfileGridProps) => {
  if (profiles.length === 0) {
    return (
      <div className={classNames}>
        <p className='text-sm text-description italic'>No profiles yet.</p>
      </div>
    );
  }

  return (
    <div className={classNames}>
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onSelect?.(profile.id)}
            className='p-3 rounded-md border border-separator text-left hover:bg-hoverSurface transition-colors'
          >
            <p className='text-sm font-medium truncate'>{profile.name}</p>
            {profile.tag && <p className='text-xs text-description'>{profile.tag}</p>}
            {(profile.updatedCount ?? 0) > 0 && (
              <p className='text-xs text-accentText mt-1'>★ {profile.updatedCount} new</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Create ProfileSummary.tsx**

File: `packages/plugins/plugin-sidekick/src/components/ProfileSummary.tsx`

```typescript
//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type ProfileSummaryProps = {
  summary?: string;
  onOpen?: () => void;
  classNames?: string;
};

export const ProfileSummary = ({ summary, onOpen, classNames }: ProfileSummaryProps) => {
  return (
    <div className={classNames}>
      {summary ? (
        <button onClick={onOpen} className='text-left w-full'>
          <p className='text-sm text-description whitespace-pre-wrap line-clamp-4'>{summary}</p>
        </button>
      ) : (
        <p className='text-sm text-description italic'>No user profile yet.</p>
      )}
    </div>
  );
};
```

- [ ] **Step 5: Create Permissions.tsx**

File: `packages/plugins/plugin-sidekick/src/components/Permissions.tsx`

```typescript
//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type PermissionEntry = {
  profileId: string;
  name: string;
  autoRespond: boolean;
  createDraft: boolean;
  researchEnabled: boolean;
};

export type PermissionsProps = {
  entries: PermissionEntry[];
  onUpdate?: (profileId: string, field: 'autoRespond' | 'createDraft' | 'researchEnabled', value: boolean) => void;
  classNames?: string;
};

export const Permissions = ({ entries, onUpdate, classNames }: PermissionsProps) => {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={classNames}>
      <table className='w-full text-sm'>
        <thead>
          <tr className='text-left text-description'>
            <th className='pb-1 font-normal'>Contact</th>
            <th className='pb-1 font-normal text-center'>Auto-respond</th>
            <th className='pb-1 font-normal text-center'>Draft</th>
            <th className='pb-1 font-normal text-center'>Research</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.profileId} className='border-t border-separator'>
              <td className='py-1'>{entry.name}</td>
              <td className='py-1 text-center'>
                <input
                  type='checkbox'
                  checked={entry.autoRespond}
                  onChange={() => onUpdate?.(entry.profileId, 'autoRespond', !entry.autoRespond)}
                />
              </td>
              <td className='py-1 text-center'>
                <input
                  type='checkbox'
                  checked={entry.createDraft}
                  onChange={() => onUpdate?.(entry.profileId, 'createDraft', !entry.createDraft)}
                />
              </td>
              <td className='py-1 text-center'>
                <input
                  type='checkbox'
                  checked={entry.researchEnabled}
                  onChange={() => onUpdate?.(entry.profileId, 'researchEnabled', !entry.researchEnabled)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

- [ ] **Step 6: Create components/index.ts**

File: `packages/plugins/plugin-sidekick/src/components/index.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './ActionItems';
export * from './DayAhead';
export * from './Permissions';
export * from './ProfileGrid';
export * from './ProfileSummary';
```

- [ ] **Step 7: Commit**

```bash
git add packages/plugins/plugin-sidekick/src/components/
git commit -m "feat(plugin-sidekick): add dashboard primitive components"
```

---

### Task 7: SidekickArticle container

**Files:**
- Create: `packages/plugins/plugin-sidekick/src/containers/SidekickArticle/SidekickArticle.tsx`
- Create: `packages/plugins/plugin-sidekick/src/containers/SidekickArticle/index.ts`
- Create: `packages/plugins/plugin-sidekick/src/containers/index.ts`

Reference: `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx`

- [ ] **Step 1: Create SidekickArticle.tsx**

File: `packages/plugins/plugin-sidekick/src/containers/SidekickArticle/SidekickArticle.tsx`

```typescript
//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Agent } from '@dxos/assistant-toolkit/types';
import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Panel } from '@dxos/react-ui';

import { ActionItems, DayAhead, Permissions, ProfileGrid, ProfileSummary } from '#components';
import { meta } from '#meta';

export type SidekickArticleProps = AppSurface.ObjectArticleProps<typeof Agent.Agent.Type>;

export const SidekickArticle = ({ role, subject: agent, attendableId: _attendableId }: SidekickArticleProps) => {
  const { t } = useTranslation(meta.id);

  // Phase 1: Static dashboard shell. Data wiring will be added incrementally.
  const sections = useMemo(
    () => [
      { key: 'day-ahead', title: t('day-ahead.title') },
      { key: 'action-items', title: t('action-items.title') },
      { key: 'profiles', title: t('profiles.title') },
      { key: 'user-profile', title: t('user-profile.title') },
      { key: 'permissions', title: t('permissions.title') },
    ],
    [t],
  );

  return (
    <Panel.Root role={role} className='dx-document overflow-y-auto'>
      <Panel.Content>
        <h1 className='text-lg font-semibold mb-4'>{t('dashboard.title')}</h1>

        {sections.map((section) => (
          <div key={section.key} className='mb-6'>
            <h2 className='text-sm font-medium text-description mb-2'>{section.title}</h2>
            {section.key === 'day-ahead' && <DayAhead />}
            {section.key === 'action-items' && <ActionItems items={[]} />}
            {section.key === 'profiles' && <ProfileGrid profiles={[]} />}
            {section.key === 'user-profile' && <ProfileSummary />}
            {section.key === 'permissions' && <Permissions entries={[]} />}
          </div>
        ))}
      </Panel.Content>
    </Panel.Root>
  );
};
```

- [ ] **Step 2: Create SidekickArticle/index.ts**

File: `packages/plugins/plugin-sidekick/src/containers/SidekickArticle/index.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

export { SidekickArticle as default } from './SidekickArticle';
```

- [ ] **Step 3: Create containers/index.ts**

File: `packages/plugins/plugin-sidekick/src/containers/index.ts`

```typescript
//
// Copyright 2025 DXOS.org
//

export { default } from './SidekickArticle';
```

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-sidekick/src/containers/
git commit -m "feat(plugin-sidekick): add SidekickArticle dashboard container"
```

---

### Task 8: SidekickPlugin definition

**Files:**
- Create: `packages/plugins/plugin-sidekick/src/SidekickPlugin.tsx`

Reference: `packages/plugins/plugin-chess/src/ChessPlugin.tsx`

- [ ] **Step 1: Create SidekickPlugin.tsx**

File: `packages/plugins/plugin-sidekick/src/SidekickPlugin.tsx`

```typescript
//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { SidekickBlueprint } from '#blueprints';
import { BlueprintDefinition, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Sidekick } from '#types';

import { translations } from './translations';

export const SidekickPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addSchemaModule({ schema: [Sidekick.Profile, Sidekick.Properties] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

Note: No `addMetadataModule` for now — the sidekick agent is created programmatically, not via the standard "create object" UI flow. The Agent.Agent type metadata is already provided by plugin-assistant. We register our custom types (Profile, Properties) so they're available in the ECHO schema.

- [ ] **Step 2: Verify build**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-sidekick && moon run plugin-sidekick:build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-sidekick/src/SidekickPlugin.tsx
git commit -m "feat(plugin-sidekick): add SidekickPlugin definition"
```

---

### Task 9: Register plugin in composer-app

**Files:**
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`

- [ ] **Step 1: Add import**

Add to the imports section of `packages/apps/composer-app/src/plugin-defs.tsx`, in alphabetical order among the `@dxos/plugin-*` imports:

```typescript
import { SidekickPlugin } from '@dxos/plugin-sidekick';
```

- [ ] **Step 2: Add to plugin list**

In the `getPlugins()` function, add `SidekickPlugin()` to the defaults array. Look for where other agent-related or experimental plugins are listed (near `isDev || isLabs` conditional blocks) and add it there:

```typescript
(isDev || isLabs) && SidekickPlugin.meta.id,
```

Or if it should be unconditionally enabled:

```typescript
SidekickPlugin(),
```

Choose placement based on where similar plugins (plugin-assistant, plugin-automation) are registered. The sidekick is experimental, so gating behind `isLabs` is appropriate.

- [ ] **Step 3: Add workspace dependency**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-sidekick && pnpm add --filter "@dxos/composer-app" "@dxos/plugin-sidekick@workspace:*"`

- [ ] **Step 4: Verify build**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-sidekick && moon run composer-app:build`
Expected: Build succeeds with the new plugin registered.

- [ ] **Step 5: Commit**

```bash
git add packages/apps/composer-app/src/plugin-defs.tsx packages/apps/composer-app/package.json pnpm-lock.yaml
git commit -m "feat(plugin-sidekick): register SidekickPlugin in composer-app"
```

---

### Task 10: Full build and lint check

- [ ] **Step 1: Run lint**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-sidekick && moon run plugin-sidekick:lint -- --fix`
Expected: No errors (warnings are OK).

- [ ] **Step 2: Run full build**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-sidekick && moon run plugin-sidekick:build`
Expected: Build succeeds.

- [ ] **Step 3: Run format**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-sidekick && pnpm format`
Expected: Files formatted.

- [ ] **Step 4: Fix any issues and commit**

If lint or build found issues, fix them and commit:

```bash
git add -A
git commit -m "fix(plugin-sidekick): address lint and build issues"
```

- [ ] **Step 5: Verify composer-app still builds**

Run: `cd /Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-sidekick && moon run composer-app:build`
Expected: Build succeeds.
