//
// Copyright 2023 DXOS.org
//

import { Chat, Agent, McpServer } from '@dxos/assistant-toolkit';
import { Blueprint, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';

import { meta } from '#meta';

// TODO(burdon): Standardize translation names.
export const translations: Resource[] = [
  ...componentsTranslations,
  ...formTranslations,
  {
    'en-US': {
      [Blueprint.Blueprint.typename]: {
        'typename.label': 'Blueprint',
        'typename.label_zero': 'Blueprints',
        'typename.label_one': 'Blueprint',
        'typename.label_other': 'Blueprints',
        'object-name.placeholder': 'New blueprint',
        'add-object.label': 'Add blueprint',
        'rename-object.label': 'Rename blueprint',
        'delete-object.label': 'Delete blueprint',
        'object-deleted.label': 'Blueprint deleted',
      },
      [Type.getTypename(Routine.Routine)]: {
        'typename.label': 'Routine',
        'typename.label_zero': 'Routines',
        'typename.label_one': 'Routine',
        'typename.label_other': 'Routines',
        'object-name.placeholder': 'New routine',
        'add-object.label': 'Add routine',
        'rename-object.label': 'Rename routine',
        'delete-object.label': 'Delete routine',
        'object-deleted.label': 'Routine deleted',
      },
      [Sequence.typename]: {
        'typename.label': 'Sequence',
        'typename.label_zero': 'Sequences',
        'typename.label_one': 'Sequence',
        'typename.label_other': 'Sequences',
        'object-name.placeholder': 'New sequence',
        'add-object.label': 'Add sequence',
        'rename-object.label': 'Rename sequence',
        'delete-object.label': 'Delete sequence',
        'object-deleted.label': 'Sequence deleted',
      },
      [Chat.Chat.typename]: {
        'typename.label': 'AI Chat',
        'object-name.placeholder': 'New AI Chat',
        'add-object.label': 'Add AI chat',
        'rename-object.label': 'Rename AI Chat',
        'delete-object.label': 'Delete AI Chat',
        'object-deleted.label': 'AI Chat deleted',
      },
      [McpServer.McpServer.typename]: {
        'typename.label': 'MCP Server',
        'typename.label_zero': 'MCP Servers',
        'typename.label_one': 'MCP Server',
        'typename.label_other': 'MCP Servers',
      },
      [Agent.Agent.typename]: {
        'typename.label': 'Agent',
        'typename.label_zero': 'Agents',
        'typename.label_one': 'Agent',
        'typename.label_other': 'Agents',
        'object-name.placeholder': 'New agent',
        'add-object.label': 'Add agent',
        'rename-object.label': 'Rename agent',
        'delete-object.label': 'Delete agent',
        'object-deleted.label': 'Agent deleted',
      },
      // TODO(burdon): Reconcile with react-ui-chat.
      [meta.id]: {
        'templates.label': 'Templates',
        'open-ambient-chat.label': 'Open Assistant',
        'assistant-chat.label': 'Assistant',
        'plugin.name': 'Assistant',
        'settings.title': 'Assistant settings',
        'object.placeholder': 'New prompt',
        'create-object.label': 'Create prompt',
        'create-trigger.label': 'Create trigger',
        'create-stack-section.label': 'Create prompt',
        'command.placeholder': 'Enter slash command...',
        'template.placeholder': 'Enter template...',
        'value.placeholder': 'Enter value...',
        'prompt-rules.label': 'Prompt Rules',
        'typename.placeholder': 'Enter typename of objects which this template is for',
        'description.placeholder': 'Enter description of when this template should be used',
        'select-preset-template.placeholder': 'Select preset',
        'service-registry.label': 'Service Registry',
        'type-filter.placeholder': 'Type',
        'any-type-filter.label': 'Any',
        'no-blueprint.message': 'No active blueprints',
        'tool-call.label': 'Calling',
        'tool-result.label': 'Success',
        'tool-error.label': 'Tool call failed',

        'invocations.label': 'Invocations',
        'trace.label': 'Trace',

        'assistant-dialog.title': 'Assistant',
        'open-assistant.label': 'Open assistant',
        'reset-blueprints.label': 'Reset blueprints',

        'no-results.message': 'No results',

        'cancel.button': 'Cancel',
        'save.button': 'Save',
        'new-thread.button': 'New Chat',
        'rename-thread.button': 'Rename Chat',
        'chat-history.label': 'Chat History',
        'chat-update-name.label': 'Update AI Chat name',

        'toolkit.label': 'Toolkit',
        'stats.label': 'Stats',
        'summary.label': 'Summary',
        'thinking.label': 'Thinking',

        'search.placeholder': 'Search...',
        'prompt.placeholder': 'Enter question or command...',
        'context-objects.button': 'Add to context',
        'context-settings.button': 'Chat settings',
        'microphone.button': 'Click to speak',
        'cancel-processing.button': 'Stop processing',
        'blueprints-in-context.title': 'Blueprints',
        'objects-in-context.title': 'Content',
        'remove-object-in-context.label': 'Remove document',
        'chat-view.title': 'View',
        'chat-view.normal.label': 'Normal',
        'chat-view.thinking.label': 'Thinking',
        'chat-view.verbose.label': 'Verbose',
        'chat-view.summary.label': 'Summary',
        'chat-model.title': 'Models',
        'mcp-servers.title': 'MCP',
        'mcp-server-add.label': 'Add MCP server',
        'mcp-server-remove.label': 'Remove MCP server',
        'mcp-server-name.label': 'Server name',
        'mcp-server-name.placeholder': 'Name',
        'mcp-server-url.label': 'Server URL',
        'mcp-server-url.placeholder': 'https://...',
        'mcp-server-protocol.label': 'Protocol',
        'mcp-server-api-key.label': 'API key',
        'mcp-server-api-key.placeholder': 'API key (optional)',

        'debug.button': 'Debug',
        'online-switch.label': 'Online',
        'run-prompt.label': 'Run prompt',
        'typename.label': 'Typename',
        'branch-thread.menu': 'Branch chat',
        'chat-toolbar.title': 'Chat toolbar',

        // Trigger status
        'trigger-status-disabled.label': 'Triggers disabled',
        'trigger-status-idle.label': 'Triggers idle',
        'trigger-status-edge.label': 'Triggers will run on EDGE',
        'trigger-status-running.label': 'Trigger running',
        'trigger-status-error.label': 'Trigger error',
        'trigger-runtime.label': 'Auto trigger execution',
        'trigger-last-invocation.label': 'Last run',
        'trigger-duration.label': 'Duration',

        // AgentArticle.
        'project-empty-spec.message': 'Open the Properties companion to configure the agent.',
        'project-empty-spec.description': 'Open the Assistant companion to interact with the agent.',
        'artifacts.label': 'Artifacts',
        'input-queue.label': 'Inputs',

        // AgentProperties.
        'instructions.label': 'Instructions',
        'instructions.placeholder': 'Enter instructions, goals, and constraints for the assistant.',
        'reset-history.button': 'Reset',
        'subscriptions.label': 'Subscriptions',
      },
    },
  },
];
