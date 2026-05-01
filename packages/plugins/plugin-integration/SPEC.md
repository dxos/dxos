# plugin-token-manager

Secure API key and authentication token storage.

## Status

Stable.

## Description

Manages credentials and API tokens for external service integrations. Tokens are stored with encryption and accessed by other plugins at runtime.

## Features

- **Token storage**: Securely store API keys and OAuth tokens.
- **Token retrieval**: Plugins access tokens by service name at runtime.
- **UI management**: Add, update, and delete tokens via settings panel.
- **Encryption**: Tokens encrypted at rest in ECHO.

## Schema

None (tokens stored in encrypted plugin state).
