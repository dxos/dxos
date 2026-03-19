# plugin-assistant

AI assistant integration for DXOS Composer.

## Status

Labs (experimental).

## Description

Provides AI-powered assistance within the workspace, connecting to configured AI services to answer questions, summarize content, and perform actions on workspace objects.

## Features

- **AI chat**: Conversational interface for querying and acting on workspace content.
- **Service configuration**: Configure AI backend services (e.g., OpenAI, local models).
- **Context awareness**: Passes relevant workspace context to the AI model.
- **Tool use**: AI can invoke operations on workspace objects.
- **Translations**: Localizable UI strings.

## Schema

- `org.dxos.type.service` — AI service configuration object.
