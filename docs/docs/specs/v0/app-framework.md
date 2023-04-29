# App Framework Notes

## Summary

Application framework ontology:

- **Vault**: HALO universal app (PWA).
- **Shell**: Main application container that manages Surfaces.
- **Surface**: Configurable UI Container that provides screen (AR? voice?) real-estate to Plugins.
- **Plugin**: App module that implements the App's functionality. 
- **Frame**: UI component that operates on part of the App's ECHO Graph.

### Apps and Surfaces

- The App defines the layout of multiple Surfaces.
- Surfaces are decoupled application containers that contain a single root component (Frame), which may be set dynamically by the application (e.g., via Actions).
- The App's UX is made up ENTIRELY from Surfaces and their contained Frames.
  - E.g., a degenerative App my contain a single Surface; a simple App may contain just two Surfaces (e.g., "sidebar" and "main"); other Apps may have collections of possibly nested surfaces.
- Each Surface has a current state managed by the App.
  - The state includes the current Frame identifier as well as state specific to the Frame (e.g., currently selected item).
  - The App's state is defined by the set of all Surface states, which may be encoded (in full or in part) by a Web URL.
  - Surfaces may have chrome (e.g., the Sidebar Surface may have open/close buttons).
- The Surface Controller defines a mapping from the Router to the state of individual Surfaces. The Router is update via events emitted by Surfaces.

### Plugins and Frames

- Apps contain one or more Plugins, which define client-side business logic and declare one or more Frames.
- Frames are modular UI components that may be independently published and updated. Frames may be shared across multiple Plugins.
- Plugins have access to a logical subgraph of either the current Space, or the user's Brane (i.e., set of accessible Spaces). 
- Plugins declare metadata (published to the DMG) that defines the scope of the dataset they operate on (e.g., Set of Schemas or Queries).
  - Depending on the surface isolation model, we may be able to constrain the scope of access.
  - Queries may be represented by a GraphQL/Prisma-like DSL.
- Plugins and Frames may be published independently and dynamically discovered and installed/loaded.
  - Given access to a Space, the App may present to the user a set of Plugins that could be dynamically installed to satisfy the constraints of the Space's data (schemata).
- Plugins are loosely coupled and interact with each other via typed events called Actions; Actions may cause Surfaces to dynamically change their content (i.e., swap-in a new Frame).

## Examples

- **Navigator**
  - Implements a hierarchical view of the Brane.
  - Top level nodes represent Spaces.
  - Space child nodes represent Schema.
  - Schema child nodes represent ECHO objects.
  - Alternatively, the navigator may represent a tree view of the queries declared by other Plugins.
    - I.e., as Plugins are loaded, the scope of the navigator grows.
- **Explorer**
  - Implements a flat arrangement of sections containing logically grouped data (i.e., flattened graph).
  - Sections contain ECHO objects.
  - May contain a subset of the graph: e.g., only showing "suggested" (recent, contextually relevant) objects. 
    - This allows for the representation of potentially large datasets, which may be paged/streamed from remotely located Spaces (e.g., via KUBE agents).
- **Universal Search**
  - Implements controls to query/filter the Brane.
  - Displays a flat list of search results, which may be represented as a compact table (icon, label, snippet).
    - NOTE: Results may be represented in other forms (e.g., thumbnails, cards).
  - A Search Action may cause the "sidebar" surface to swap-in the Search Plugin. 
  - The Search Plugin emits "search update" events which enable other subscribed Plugins to modify their content (e.g., filter inbox messages.) 
    - Thus, all Plugins can avail themselves of the generic search functionality. 
    - Plugins can also constrain the Search (by means of metadata in the Action -- e.g., to search over a specific Schema type.)
- **Stack**
  - Implements a column of content sections, which may be re-arranged.
  - Stacks are associated with a single root ECHO object, which contains or references objects that are rendered by the sections.
- **Presenter***
  - Implements a specialized stack where each section is a markdown slide.
  - Slides may contain Surfaces that contain other Frames.
  - Enables fullscreen mode where only the Main Surface is visible, and prompts the App to enter FSM.
- **Universal Inbox**
  - Implements a dynamic view onto ECHO objects represented by the message Schema (that spans different sources of messages: Email, Chat, etc.)
  - Implements a master-detail view
  - The detail view is rendered in a nested Surface, which may contain a Message Stack (i.e., set of sections that represent a conversation, 
    or sections representing information relating to the message: e.g., Contact, Content, Documents.)
- **CRM**
  - Defines a set of Frames that implements a CRM workflow: e.g., Contact Manager, Calendar, Task List, Kanban.
- **Assistant**
  - Implements:
    - A conversational text/voice interaction with an LLM;
    - Suggestions from the LLM relating to the current context (discovered by Plugin context update Actions).
