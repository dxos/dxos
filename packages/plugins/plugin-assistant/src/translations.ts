//
// Copyright 2023 DXOS.org
//

import { Agent, Chat, McpServer } from '@dxos/assistant-toolkit';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Sequence } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as assistantTranslations } from '@dxos/react-ui-assistant/translations';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as taskTranslations } from '@dxos/react-ui-task/translations';

import { meta } from '#meta';

export const translations: Resource[] = [
  ...assistantTranslations,
  ...componentsTranslations,
  ...formTranslations,
  ...taskTranslations,
  {
    'en-US': {
      [Type.getTypename(Skill.Skill)]: {
        'typename.label': 'Skill',
        'typename.label_zero': 'Skills',
        'typename.label_one': 'Skill',
        'typename.label_other': 'Skills',
        'object-name.placeholder': 'New skill',
        'add-object.label': 'Add skill',
        'rename-object.label': 'Rename skill',
        'delete-object.label': 'Delete skill',
        'object-deleted.label': 'Skill deleted',
      },
      [Type.getTypename(Instructions.Instructions)]: {
        'typename.label': 'Instructions',
        'typename.label_zero': 'Instructions',
        'typename.label_one': 'Instructions',
        'typename.label_other': 'Instructions',
        'object-name.placeholder': 'New instructions',
        'add-object.label': 'Add instructions',
        'rename-object.label': 'Rename instructions',
        'delete-object.label': 'Delete instructions',
        'object-deleted.label': 'Instructions deleted',
      },
      [Type.getTypename(Sequence.Sequence)]: {
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
      [Type.getTypename(Chat.Chat)]: {
        'typename.label': 'Session',
        'typename.label_zero': 'Sessions',
        'typename.label_one': 'Session',
        'typename.label_other': 'Sessions',
        'object-name.placeholder': 'New session',
        'add-object.label': 'Add Session',
        'rename-object.label': 'Rename session',
        'delete-object.label': 'Delete session',
        'object-deleted.label': 'Session deleted',
      },
      [Type.getTypename(McpServer.McpServer)]: {
        'typename.label': 'MCP Server',
        'typename.label_zero': 'MCP Servers',
        'typename.label_one': 'MCP Server',
        'typename.label_other': 'MCP Servers',
      },
      [Type.getTypename(Agent.Agent)]: {
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
      [meta.profile.key]: {
        'delete-task.label': 'Delete task',
        'templates.label': 'Templates',
        'open-ambient-chat.label': 'Open Assistant',
        'assistant-chat.label': 'Assistant',
        'plugin.name': 'Assistant',
        'object.placeholder': 'New prompt',
        'create-object.label': 'Create prompt',
        'create-trigger.label': 'Create trigger',
        'create-stack-section.label': 'Create prompt',
        'value.placeholder': 'Enter value...',
        'prompt-rules.label': 'Prompt Rules',
        'typename.placeholder': 'Enter typename of objects which this template is for',
        'description.placeholder': 'Enter description of when this template should be used',
        'select-preset-template.placeholder': 'Select preset',
        'service-registry.label': 'Service Registry',
        'type-filter.placeholder': 'Type',
        'any-type-filter.label': 'Any',
        'no-skill.message': 'No active skills',
        'tool-call.label': 'Calling',
        'tool-result.label': 'Success',
        'tool-error.label': 'Tool call failed',

        'invocations.label': 'Invocations',
        'trace.label': 'Trace',

        'trace-filter.menu': 'Filter processes',
        'trace-filter-all.label': 'Show all',
        'trace-filter-none.label': 'Hide all',
        'trace-environment-app.label': 'App',
        'trace-environment-space.label': 'Space',
        'trace-environment-conversation.label': 'Conversation',

        'assistant-dialog.title': 'Assistant',
        'open-assistant.label': 'Open assistant',
        'import-compute-operations.label': 'Import compute operations',
        'set-trace-panel-debug.label': 'Toggle trace panel debug view',

        'no-results.message': 'No results',

        'cancel.button': 'Cancel',
        'cancel-queued.button': 'Remove from queue',
        'save.button': 'Save',
        'new-thread.button': 'New Chat',
        'rename-thread.button': 'Rename Chat',
        'chat-history.label': 'Chat History',
        'chat-update-name.label': 'Update AI Chat name',
        'create-chat.label': 'New AI Chat',

        'toolkit.label': 'Toolkit',
        'stats.label': 'Stats',
        'summary.label': 'Summary',
        'rewind.label': 'Rewind to here',
        'thinking.label': 'Thinking',

        'connect.label': 'Connect',
        'integration-prompt.title': 'Connect {{service}}',
        'integration-prompt.description': 'This action needs access to {{service}}. Connect it to continue.',
        'integration-prompt.unavailable': 'No connector is available for {{service}}.',
        'integration-prompt.scopes': 'Permissions needed:',

        'plugin-prompt.title': 'Enable {{plugin}}',
        'plugin-prompt.description': 'This action needs the {{plugin}} plugin. Enable it to continue.',
        'plugin-prompt.enabled': '{{plugin}} is enabled.',
        'plugin-prompt.unavailable': '{{plugin}} is not installed on this device.',
        'plugin-prompt.failed': 'Could not enable {{plugin}}. Try again from the plugin registry.',
        'plugin-prompt.button': 'Enable',

        'search.placeholder': 'Search...',
        'prompt.placeholder': 'Enter question or command...',
        'context-objects.button': 'Add to context',
        'context-settings.button': 'Chat settings',
        'send.label': 'Send',
        'cancel-processing.button': 'Stop processing',
        'show-tasks.button': 'Show tasks',
        'hide-tasks.button': 'Hide tasks',

        'options.skills.title': 'Skills',
        'options.mcp.title': 'MCP',
        'options.chat-model.title': 'Models',
        'remove-object.label': 'Remove object',

        'chat-view.title': 'View',
        'chat-view.normal.label': 'Normal',
        'chat-view.summary.label': 'Summary',
        'chat-view.thinking.label': 'Thinking',
        'chat-view.debug.label': 'Debug',
        'mcp-server-add.label': 'Add MCP server',
        'mcp-server-remove.label': 'Remove MCP server',
        'mcp-server-name.label': 'Server name',
        'mcp-server-name.placeholder': 'Name',
        'mcp-server-url.label': 'Server URL',
        'mcp-server-url.placeholder': 'https://...',
        'mcp-server-protocol.label': 'Protocol',
        'mcp-server-api-key.label': 'API key',
        'mcp-server-api-key.placeholder': 'API key (optional)',
        'mcp-server-error.label': 'MCP server unavailable',
        'ai-service-error.label': 'AI service error',
        'view-usage.label': 'View usage',

        // LLM provider labels.
        'settings.provider.edge.label': 'Edge',
        'settings.provider.built-in.label': 'Built-in',
        'settings.provider.ollama.label': 'Ollama',
        'settings.provider.lmstudio.label': 'LM Studio',

        // Ollama local model management (desktop only).
        'settings.ollama.title': 'Local models',
        'settings.ollama.installed.label': 'Downloaded models',
        'settings.ollama.empty.message': 'No models downloaded. Pull one below to get started.',
        'settings.ollama.pull.label': 'Pull model',
        'settings.ollama.pull.placeholder': 'Search or enter a model name (e.g. llama3.2:1b)',
        'settings.ollama.pull-custom.label': 'Pull “{{name}}”',
        'settings.ollama.pulling.label': 'Pulling…',
        'settings.ollama.pulling.message': 'Downloading… {{percent}}%',
        'settings.ollama.cancel.label': 'Cancel download',
        'settings.ollama.loaded.label': 'Loaded',
        'settings.ollama.loaded.vram': 'Loaded · {{size}}',
        'settings.ollama.load.label': 'Load into memory',
        'settings.ollama.unload.label': 'Unload from memory',
        'settings.ollama.remove.label': 'Delete model',
        'settings.ollama.failed.message': 'Could not reach the local model service: {{error}}',

        'debug.button': 'Debug',
        'online-switch.label': 'Online',
        'typename.label': 'Typename',
        'branch-thread.menu': 'Branch chat',
        'chat-toolbar.title': 'Chat toolbar',

        // Trigger status
        'trigger-status-disabled.label': 'Triggers disabled',
        'trigger-status-idle.label': 'Triggers idle',
        'trigger-status-running.label': 'Trigger running',
        'trigger-status-error.label': 'Trigger error',
        'trigger-runtime.label': 'Auto trigger execution',
        'trigger-last-invocation.label': 'Last run',
        'trigger-duration.label': 'Duration',

        // AgentArticle.
        'project-empty-spec.message': 'Open the Properties companion to configure the agent.',
        'project-empty-spec.description': 'Open the Assistant companion to interact with the agent.',
        'artifacts.label': 'Artifacts',
        'inputs.label': 'Inputs',

        // AgentProperties.
        'instructions.label': 'Instructions',
        'instructions.placeholder': 'Enter instructions, goals, and constraints for the assistant.',
        'reset-history.button': 'Reset',
        'subscriptions.label': 'Subscriptions',

        // Per-space Home article: starter-prompt cards + the pinned assistant prompt.
        'space-home.suggestions.heading': 'Get started',
        'space-home.suggestion-magazine.label': 'Create feeds for tracking the latest AI news and build a magazine',
        'space-home.suggestion-spreadsheet.label':
          "Look up and create a spreadsheet of MLB's top starters by month for {{year}}",
        'space-home.suggestion-kanban.label': 'Create a kanban view for tracking tasks',
        'space-home.prompt.placeholder': 'Ask the assistant anything…',

        'nav-tree-group-ai.label': 'Assistant',
      },
    },
  },
];
