# Alien Labs team

The people and agents of Alien Labs, a fictional 10-person company that builds Cairn, a hosted
build cache for monorepos. Cairn is built on DXOS: its dashboard is a Composer plugin, and its
Builder, Reviewer, Triage and Scribe agents run on EDGE compute, so their chats and traces are DXOS
objects in the team's space. Astrid Holm, engineering manager, is the main character. The other
Alien Labs partials build on this one.

- Code: `partial.ts`, with `organization.ts`, `people.ts` and `agents.ts`
- Requires: nothing
- Provides: `orgs.fieldstone`, `people.<key>`, `agents.<key>`
- Clock: unused
- Used by: `FieldstoneSpace.makeTemplate`

## Contents

### Organization

- 1 `Organization.Organization` `fieldstone`: Alien Labs, status `active`, website
  `https://alienlabs.dev`, description "Builds Cairn, a hosted build cache for monorepos, on DXOS:
  the dashboard is a Composer plugin and the agents run on EDGE. Remote team, Lisbon and Toronto."

### People

- 10 `Person.Person`, each with `fullName`, `jobTitle`, `department`, a work email
  `<first>@alienlabs.dev`, a location, and `Person → Organization (organization)` to `fieldstone`.
  Department is Engineering unless noted:
  - `astrid` Astrid Holm, Engineering Manager
  - `omar` Omar Haddad, Staff Engineer, cache engine
  - `felix` Felix Andersen, Backend Engineer, cache engine
  - `june` June Okonkwo, Senior Engineer, API and billing
  - `tomas` Tomás Vidal, Frontend Engineer
  - `anika` Anika Rao, Site Reliability Engineer
  - `ben` Ben Achterberg, Product Designer, Design
  - `lucia` Lucía Ferreira, Product Manager, Product
  - `kofi` Kofi Mensah, Developer Advocate, Developer Relations
  - `hana` Hana Sato, Software Engineer, joined two weeks before the reference date

### Agents

- 4 `Agent`, each with `name`, `did`, `enabled: true` and `instructions` that state its job:
  - `builder` Builder: writes code on a branch and opens pull requests
  - `reviewer` Reviewer: reviews pull requests and runs the test suite
  - `triage` Triage: reads issues and the inbox, files and labels tasks
  - `scribe` Scribe: drafts docs, release notes and policy text
- Other partials assign work to an agent through an `Actor` with `identityDid` set to the agent's `did`
  and `subject` set where a session exists.

## Checks

- 1 organization, 10 people, 4 agents.
- Every person links to `fieldstone`. Every email is unique.
- Every agent has a `did`, and no two agents share one.
