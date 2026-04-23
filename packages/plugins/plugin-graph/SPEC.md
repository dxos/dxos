# plugin-graph

Graph database layer and relationship modeling for the workspace.

## Status

Stable.

## Description

Provides the application graph infrastructure used by plugins to register nodes, edges, and actions. Other plugins contribute to the graph via AppGraphBuilder capabilities.

## Features

- **App graph**: Central registry of workspace nodes and relationships.
- **Graph builders**: Plugin API to contribute nodes/edges.
- **Query API**: Traverse object relationships programmatically.
- **Action registry**: Associates actions with graph nodes.

## Schema

None (infrastructure plugin).
