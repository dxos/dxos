# plugin-automation

Trigger-based automation engine for DXOS Composer.

## Status

Labs (experimental).

## Description

Enables users to define automation rules that respond to workspace events. Triggers fire when conditions are met and execute configured actions across plugins.

## Features

- **Trigger editor**: UI to create and manage automation triggers.
- **Event-driven**: Responds to ECHO object mutations, time-based, and plugin events.
- **Action execution**: Runs operations defined by other plugins (e.g., send message, create object).
- **Automation panel**: Overview of all active automations.
- **Translations**: Localizable UI strings.

## Schema

None (automation config stored via plugin state).
