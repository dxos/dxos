# plugin-transformer

Local machine learning transformer inference in the browser.

## Status

Labs (experimental).

## Description

Runs ML transformer models directly in the browser using WebAssembly and WebGPU. Provides embeddings, text classification, and other inference tasks without server dependencies.

## Features

- **In-browser inference**: Runs transformers locally via Transformers.js.
- **Embeddings**: Generate text embeddings for semantic search.
- **Text classification**: Run classification models on workspace content.
- **WebGPU acceleration**: GPU-accelerated inference where supported.
- **Model caching**: Downloaded models cached locally for offline use.

## Schema

None (inference results consumed by calling plugins).
