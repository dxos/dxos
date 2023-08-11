# `SessionGraph` proposal
@thure 10 August 2023

# Motivation

We have identified a need for app plugins to be able to:

1. add content items to the UI,
2. present content items in relation to other content items,
3. present actions related to a content item,
4. persist mutations to a content item in the UI,

in such a way that the solution is:

1. independent of any method of persistence beyond the UA’s own JS runtime,
2. itself able to be persisted or replicated (including sharing),
3. reasonably extensible by plugins without also causing corruptions.

# Assumptions

This proposal does not assume any particular limits on the host UA’s network bandwidth, memory, disk, or processing.

# Proposed solution

I propose `SessionGraph` should have an ontological structure similar to a relational database, where **Nodes** are stored separately from **Relations**.

## Nodes

Nodes must support the following:

1. A scalar identifier unique within the session
2. A static or translatable label
3. A serializable, but possibly arbitrary, record of properties that a plugin can recognize and use as a way to resolve an entity the Node represents
  - This _may_ include details about provenance
  - This _may_ include a graphical way to present the node (references to an icon or image)

## Relations

Relations must support the following:

1. One-to-one relation between one Node and another Node
2. One-to-many relations between one Node and a set of Nodes

## Not stored in `SessionGraph`: functions, class instances, etc

So that the `SessionGraph` can be persisted and replicated, plugins must be able to resolve the entity a Node represents on their own at runtime.

# Implementation

In the rest of this proposal I will refer to the following types:

```tsx
type Identifier = string;

type NodeKey = `dxos.org/${Identifier}`;

export type Params =
    | string
    | number
    | boolean
    | null
    | undefined
    | Params[]
    | Record<string, Params>;
    
type Node = {
  id: NodeKey;
  label: string | [string, {ns: string}];
  params?: Record<string, Params>;
};

type RelationType = string;

type RelationKey = `${RelationType}-${ 'child' | 'parent' }`;

type SessionGraph = {
  nodes: Deepsignal<
    Map<NodeKey, Node>
  >;
  relations: Deepsignal<
    Map<
      NodeKey,
      Map<
        RelationKey,
        NodeKey | Set<NodeKey>
      >
  >
  >;
};
```

## Examples for min-viable use-cases

We agreed to several use-cases that any solution must facilitate.

### Basics

Plugins should be able to add content items and a node under which they can be organized by the plugin that added the content items.

e.g.:
> `MarkdownPlugin` can add nodes representing documents it finds and associate them with a node that represents itself as the documents’ provenance

#### Adding content items

```tsx
const MARKDOWN_NS = 'dxos.org/markdown-plugin';

const MARKDOWN_GROUP = `${MARKDOWN_PLUGIN}/documents`;

const handleReady = async () => {
    
    // The plugin creates its fallback group node
  const groupNode: Node = {
    id: MARKDOWN_GROUP,
    label: ['plugin name', {ns: MARKDOWN_NS}],
    params: {
      provenance: MARKDOWN_NS,
      icon: 'ArticleMedium'
    },
  };
  
  // Adds the group node to the graph
  sessionGraph.addNodes(groupNode);
  
  // Gets the entities from its ontological substrate, possibly specifying that it only needs certain parts of the entities
  const documents = await runQuery(MarkdownSessionGraphQuery);
  
  // Creates content nodes from the query results
  const contentNodes: Node[] = documents.map((document)=>({
    id: document.id,
    label: document.title ?? ['untitled document', {ns: MARKDOWN_NS}],
    params: {
        provenance: MARKDOWN_NS,
      icon: document.icon ?? 'ArticleMedium'
    }
  }));
    
    // Adds the query result nodes to the graph
  sessionGraph.addNodes(...contentNodes);
    
    // Creates the one-to-many child relation from the group node to the content nodes
  const provenanceChildrenRelation = {
    of: MARKDOWN_GROUP,
    by: new Set(documents.map(({id})=>id)),
    key: 'provenance-child'
  }
  
  // Creates the one-to-one parent relations from the content nodes back to the group node
  const provenanceParentRelations = documents.reduce((acc, document)=>{
    acc.push({of: document.id, by: MARKDOWN_GROUP, key: 'provenance-parent'})
  }, []);
  
  // Adds both kinds of relation to the graph
  sessionGraph.addRelations(provenanceChildrenRelation, ...provenanceParentRelations);
  
  // Done!
}
```

#### Rendering resolved data & child nodes

```tsx
const ListItem = ({ id, node }: {id: NodeKey, node: Node}) => {
  const datum = useResolvedDatum(id);
  return <Surface role='listitem' datum={datum} />
}

const List = ({id, node, relationKey = 'provenance-child'}: {id, NodeKey, node: Node, relationKey: string}) => {
  const datum = useResolvedDatum(id);
  const childNodes: Map<NodeKey, Node> = useRelatedNodes(id, relationKey);
  return <>
    <Surface role='list__meta' datum={datum} />
    <ul>
      {childNodes.entries().map((childId, node)=>(
        <ListItem id={childId} node={node}/>
      ))}
    </ul>
  </>
}
```

The hooks `useResolvedDatum` and `useRelatedNodes` leverage signals to propagate updates to the substrate entity or the node’s relations respectively.

React easily memoizes `node.id` and `relationValue` strings, so, when these change, the component tree is reevaluated at the right scope.

### Preferential relations

Plugins should be able to add a node that relates to other plugins’ content items in a way that can take precedence in some situations.

e.g.
> `GithubPlugin` can “claim” under its node the nodes added by `MarkdownPlugin` that have certain parameters `GithubPlugin` recognizes.

#### Adding preferential relations

```tsx
const GH_NS = 'dxos.org/github-plugin';

const GH_GROUP = `${MARKDOWN_PLUGIN}/documents`;

const handleReady = async () => {
    
  // The plugin creates its preferential group node
  const groupNode: Node = {
    id: GH_GROUP,
    label: ['plugin name', {ns: GH_NS}],
    params: {
      from: GH_NS,
      icon: 'GithubLogo'
    },
  };
    
    // Gets the entities from its ontological substrate
  const ghDocuments = await runQuery(GithubMarkdownSessionGraphQuery);
  
  const navmenuChildrenRelation = {
    of: MARKDOWN_GROUP,
    by: new Set(ghDocuments.map(({id})=>id)),
    key: 'navmenu-child'
  }
  
    // Creates the one-to-one parent relations from the content nodes back to the group node
  const navmenuParentRelations = documents.reduce((acc, document)=>{
    acc.push({of: document.id, by: MARKDOWN_GROUP, key: 'navmenu-parent'})
  }, []);
  
}
```

#### Rendering lists by preferential relation

```tsx

const SeparatedLists = ({id, root}: {id: NodeKey, root: Node}) => {
  const datum = useResolvedDatum(id);
  const specialChildren = useRelatedNodes(id, 'navmenu-child');
  const specialIds = new Set(specialChildren.keys());
  const allChildren = useRelatedNodes(id, 'provenance-child');
  
  return <>
    <Surface role='heading' datum={datum} />
    <ul>
      {specialChildren.entries().map((childId, node)=>(
        <ListItem id={childId} node={node}/>
      ))}
    </ul>
    <ul>
      {allChildren.entries().map((childId, node)=>(
        specialIds.has(childId) ? null : <ListItem id={childId} node={node}/>
      ))}
    </ul>
  </>
}
```

This could be made more efficient upstream by providing new hooks or augmenting existing hooks to resolve set computations as relations are processed.
### Recursive structures

Plugins should be able to organize nodes in a potentially arbitrary, recursive way, such as how files are presented in a file system.

e.g.
> `FoldersPlugin` can let users arrange folders and items which folders can contain in tree structures of potentially unlimited depth
#### Rendering recursive structures

Recursive parent-child relations are represented in `SessionGraph` as a flat collection, so in order for such structures to be added to the graph from other systems, either the existing tree should be traversed, or the relations will already map cleanly to `SessionGraph`’s representation.

This rendering technique assumes the relations are already available in the graph. It is not different from the examples above except that it is recursive.

```tsx
const TreeItem = ({id, node}) => {
  const datum = useResolvedDatum(id);
  const childNodes: Map<NodeKey, Node> = useRelatedNodes(id, relationKey);
  return childNodes.size > 0
    ? <Tree id={id} node={node} />
    : <Surface role='treeitem' datum={datum}/>;
};

const Tree = ({id, node}: {id: NodeKey, root: Node}) => {
  const datum = useResolvedDatum(id);
  const childNodes: Map<NodeKey, Node> = useRelatedNodes(id, relationKey);
  return <>
    <Surface role='tree__meta' datum={datum} />
    <ul>
      {childNodes.entries().map((childId, node)=>(
        <TreeItem id={childId} node={node}/>
      ))}
    </ul>
  </>
};

```

The node datum resolution can be attempted less frequently by differentiating between branch and leaf nodes using the result of `useRelatedNodes`.
