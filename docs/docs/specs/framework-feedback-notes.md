## Framework Feedback

2023-05-20

1. Low-level/technical

- a). Hierarchically embedded per-Plugin contexts vs. managing context value in root PluginProvider.
- b). Typed interfaces (see surfaces/src/framework/plugin.test.tsx)
- c). Action bubbling.

2. Conceptual

- a). Plugins that define routes: Can loosely coupled plugins effectively conspire to create a coordinated application route tree? or should this be the responsibility of the app?
- b). Should core DXOS framework concepts like ClientProvider be defined as plugins?
- c). Discussion re Graph plugin purpose and capabilities. (I do believe we need an application ontology).

3. Sequencing

- Could we finalize #1 and implement Stacks before wading into #2.





## Deprecated

### Composer Scenarios

- Use case
  - Collaborate on GH issue
  - Folders of markdown files (stack editor)
- Developers can extend composer (in stack?)
  - Introspect 

### Kai

** Us vs. them

- Search **
- Unviersal Inbox **
- Pres
- Contacts ** Pluggable collections
- Todos
- Bots management
- Chess
- Kanban
- Notes
- LLM ** Cross cutting
- Chat

- Tables?
- Draw?
- Files?
- Maps?

## Goals

- Full control (stack vs. full screen)
- Shared framework: Composer subset of Kai

## Non-goals

- Isolation of 3P
- Runtime extensibilty ** (component); path to ESM; dynamic discovery
- no DMG **
- Coupling to ECHO ** (Client discovery); not entire source of state?

## Defs/ontology

- App: Surfaces + components
  - ** App is component (one full screen surface at root; no sidebar)
  - ** App route/surface configuration (specific to Composer)? conflict with Route/useNav, Link => href
  - ** Non ECHO/HALO state? Options?
  - ** Dispatch/reducer? array of actions (batch); plugins define actions? SELECT (data grams); flux reducer
    - Broadcast to every plugin (change application state)
  - ** Events/action? bindings?
  - Layout is serializable (and modified by acion)
- Surface: delegate presentation to external plugins; DataContext (one or more components) ** chrome?
  - What components to render from metadata? E.g., from datum; query? ***
  - hierarchy of named surfaces?
- Components: React with App context (nest Surfaces) [Not frames]
- Plugin: Unit of distribution (Composer specific? **) name? overlap of components across multiple plugins
  - Extend app state (namespace)
  - Side-effect (e.g., write to ECHO in separate thread/worker); i.e., not pure. Return in lazy/context; update state when done.
  - Declare plugins via config; versioning?
  - Runaway actions=>actions (loosely coupled issues)
  - ** Provides components by name (semantic) mapped to component 
  - ** Can't know external surfaces but can emit events (standardly defined)
  - not ECHO specific: e.g., graph.getNodes
    - ** resolvers
  - provides (components, graph)
    - ** graph?? Node: too far ** V2 
  - Standard actions: e.g., SELECT
  - App state: FQ plugin namespace (requires registration)
- Shell: Vault: HALO button + generic UI (OS panels); dark overlay
- Vault: HALO
- Stack: component: columns of mixed content (content types); draggability

## Issues

- Composer names; BF
- BF specific vs. framework
- Developer focus too specific

- Routes/events/binding
- Plugin/overlap/resuse components (e.g., Inbox); solve with Plugin deps***
- Graph** model: Hugely opinionated (v2) [GraphNode]
  - tree layout; loosely coupled
  - Sidebar/Tree *** overly specific

- Community Fork BF or reconfigure it?
- Velocity/reources/community
  
- DMG (publishing)
- Names: Aurora
  
- Explain: Preact signals? (literally Preact)
