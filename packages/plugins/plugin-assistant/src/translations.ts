//
// Copyright 2023 DXOS.org
//

import { Agent, Chat, McpServer } from '@dxos/assistant-toolkit';
import { Instructions, Skill } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';

import { meta } from '#meta';

export const translations: Resource[] = [
  ...componentsTranslations,
  ...formTranslations,
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

        'assistant-dialog.title': 'Assistant',
        'open-assistant.label': 'Open assistant',
        'import-compute-operations.label': 'Import compute operations',
        'toggle-trace-panel-debug.label': 'Toggle trace panel debug view',

        'no-results.message': 'No results',

        'cancel.button': 'Cancel',
        'save.button': 'Save',
        'new-thread.button': 'New Chat',
        'rename-thread.button': 'Rename Chat',
        'chat-history.label': 'Chat History',
        'chat-update-name.label': 'Update AI Chat name',
        'create-chat.label': 'New AI Chat',

        'toolkit.label': 'Toolkit',
        'stats.label': 'Stats',
        'summary.label': 'Summary',
        'thinking.label': 'Thinking',

        'integration-prompt.title': 'Connect {{service}}',
        'integration-prompt.description': 'This action needs access to {{service}}. Connect it to continue.',
        'integration-prompt.unavailable': 'No connector is available for {{service}}.',

        'search.placeholder': 'Search...',
        'prompt.placeholder': 'Enter question or command...',
        'context-objects.button': 'Add to context',
        'context-settings.button': 'Chat settings',
        'microphone.button': 'Click to speak',
        'recording.placeholder': 'Recording…',
        'stop-recording.label': 'Stop recording',
        'hold-to-record.label': 'Hold to record',
        'start-recording.label': 'Start recording',
        'recording-options.label': 'Recording options',
        'record-mode.label': 'Record mode',
        'record-mode.toggle.label': 'Toggle',
        'record-mode.hold.label': 'Hold (push-to-talk)',
        'audio-device.label': 'Microphone',
        'audio-device.default.label': 'System default',
        'settings.entity-extraction.label': 'Entity extraction',
        'cancel-processing.button': 'Stop processing',

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

        'debug.button': 'Debug',
        'online-switch.label': 'Online',
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
        'inputs.label': 'Inputs',

        // AgentProperties.
        'instructions.label': 'Instructions',
        'instructions.placeholder': 'Enter instructions, goals, and constraints for the assistant.',
        'reset-history.button': 'Reset',
        'subscriptions.label': 'Subscriptions',

        // Per-space Home article: starter-prompt cards + the pinned assistant prompt.
        'space-home.suggestions.heading': 'Get started',
        'space-home.suggestion-news-magazine.label':
          'Create feeds for tracking the latest AI news and build a magazine',
        'space-home.suggestion-mlb-spreadsheet.label':
          "Look up and create a spreadsheet of MLB's top starters by month for {{year}}",
        'space-home.suggestion-kanban.label': 'Create a kanban view for tracking tasks',
        'space-home.prompt.placeholder': 'Ask the assistant anything…',

        'nav-tree-group-ai.label': 'Assistant',
      },
    },
  },
];
