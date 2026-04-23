# plugin-conductor

Visual AI workflow builder using node-based compute graphs.

## Status

Labs (experimental).

## Description

Enables users to construct complex AI agent pipelines by connecting nodes in a drag-and-drop canvas. Each node represents a data source, transformation, or AI model invocation.

## Features

- **Node graph editor**: Drag-and-drop canvas for building pipelines.
- **AI model nodes**: Connect to LLMs and ML models.
- **Data source nodes**: Ingest from ECHO objects, files, or external APIs.
- **Transformation nodes**: Filter, map, and reshape data between steps.
- **Execution engine**: Runs pipelines and streams results back to the workspace.

## Schema

None (pipeline state managed via conductor runtime).
