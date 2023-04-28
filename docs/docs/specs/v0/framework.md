# framework notes

## Intro

- I think BraneFrame is a good product name (both Brane and Plugin):
  - **Brane**: the user's collection of Spaces;
  - **Frame**: a lens onto a Brane subgraph.

CONSIDER PLUGIN

- I could envision the framework being at a lower level and having a different concept than "Plugins" (e.g., Plugin), although I think we both have concerns about over-generalization. However, perhaps Plugins may represent a grouping of Frames (e.g., CRM Plugin).
- Below is proposal variant that attempts to include the "graph" conversation.




## Summary

- Consider the following application framework ontology:
  - **Vault**: HALO universal app (PWA)
  - **App**: Application Shell that manages Surfaces. (Published to KUBE/DMG.)
  - **Surface**: Configurable UI Container that provides screen (AR? voice?) real-estate to Plugins.
  - **Plugin**: App module that implements the App's functionality. Apps may contain multiple Plugins. (Published to KUBE/DMG.) Plugins may declare/coordinate multiple Frames.
  - **Frame**: UI module that operates on part of the App's ECHO Graph.

- Apps have multiple Surfaces that may be arranged by the App Shell (e.g., mobile, web, AR) and/or re-arranged by the user.
- Surfaces contain a single Frame, which may be switched out by the App.
- The App's UX is made up ENTIRELY from Surfaces and their contained Frames.
  - A degenerative App my contain a single Surface; a simple App may contain just two Surfaces -- e.g., "sidebar" and "main"; other Apps may have collections of poissibly nested surfaces.



- Plugins may be pre-selected (and assigned to Surfaces) by the app. E.g., the App may select a generic "navigator" Plugin and allocate it to a Sidebar Surface. The user may elect to switch out the standard navigator.
- Plugins have access to a logical subgraph of the User's Brane (collection of Spaces). 
- Plugins declare metadata (published to the DMG) that define the scope of the dataset the operate on (e.g., Set of Schemas or Queries).
  - NOTE: Depending on the surface isolation model, we may be able to constrained the scope of access.
  - NOTE: Queries may be represented by a GraphQL/Prisma-like DSL.
- Plugins are loosely coupled and interact with each other via typed events called Actions.
- Plugins may be dynamically discovered and installed/loaded.
  - Given access to a Space, the App may present to the user a set of Plugins that could be dynamically installed to satisfy the constaints of the Space's schemata.
- Surfaces can subscribe to Actions and modify the contained Plugin's behavior. E.g., the "main" surface may subscribe to Actions from the "navigator" surface and switch the current content (e.g., ECHO object) or current Plugin.
- Each Surface has a current state managed by the App; the App's state is defined by the set of Surface states, which may be encoded (in full or in part) in a Web URL.
  - Surfaces may have chrome; e.g., the Sidebar Surface will have open/close buttons.
  - NOTE: Permalinks may fully encoded the App's state -- incl. active Plugins. These permalinks may be used in conjunction with Space invitations.

## Example Plugins

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
  - May contain a subset of the graph: e.g., only showing "suggested" (recent, contextually relevant) objects. This allows for the representation of potentially large datasets, which may possibly be paged/streamed from remotely located Spaces (e.g., via KUBE agents).
- **Universal Search**
  - Implements controls to filter the Brane.
  - Displays a flat list of search results, which may be represented as a compact table (icon, label, snippet).
    - NOTE: Results may be represented in other forms (e.g., thumbnails, cards).
  - A Search Action may cause the "sidebar" surface to swap-in the Search Plugin. 
  - The Search Plugin emits "search update" events which enable other subscribed Plugins to modify their content (e.g., filter inbox messages.) Thus, all Plugins can avail themselves of the generic search functionality. Plugins can also constrain the Search (by means of metadata in the Action -- e.g., to search over a specific Schema type.)
- **Stack**
  - Implements a column of content sections, which may be re-arranged.
  - Stacks are associated with a single root ECHO object, which contains or references objects that are rendered by the sections.
- **Presenter***
  - Implements a specialized stack where each section is a markdown slide.
  - Slides may contain Surfaces that contain other Frames.
  - Enables fullscreen mode where only the Main Surface is visible, and prompts the App to enter FSM.
- **Universal Inbox**
  - Implements a dynamic view onto ECHO objects represented by the message Schema (that spans different sources of messages: Email, Chat, etc.)
  - Implements a master-detail view; the detail view is rendered in a nested Surface, which may contain a Message Stack (i.e., set of sections that represent a conversation, or sections representing information relating to the message: e.g., Contact, Content, Documents.)
- **Assistant**
  - Implements:
    - A conversational text/voice interaction with an LLM;
    - Suggestions from the LLM relating to the current context (discovered by Plugin context update Actions).

## Spec

TODO(burdon): Graph binding.

```ts
type Plugin = {
  // DMG Module spec (which may be stored in DMG, or privately in a Space/HALO).
  modules: {
    id: string;
    name: string;
    description: string;
    icon: string | React.FC; // URL, aurora icon id, or base64 encoded data: URL.
    subgraph: string; // GraphQL query of Brane.
  }[];
};
```
