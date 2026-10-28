//
// Copyright 2023 DXOS.org
//

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Sequence } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { translations as assistantTranslations } from '@dxos/react-ui-assistant/translations';
import { translations as chatTranslations } from '@dxos/react-ui-chat/translations';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as taskTranslations } from '@dxos/react-ui-task/translations';
import { translations as traceTranslations } from '@dxos/react-ui-trace/translations';
import type * as Theme from '@dxos/react-ui/Theme';

import { AssistantNamespace } from './namespace.ts';

export const translations: Theme.Resource[] = [
  ...assistantTranslations,
  ...chatTranslations,
  ...componentsTranslations,
  ...formTranslations,
  ...taskTranslations,
  ...traceTranslations,
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
      [AssistantNamespace.key]: {
        'delete-task.label': 'Delete task',
        'execute-task.label': 'Execute task',
        'execute-task.prompt': 'Implement task #{{ordinal}}',
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

        'activity.starting.label': 'Starting agent',
        'activity.preparing.label': 'Preparing request',
        'activity.loading-history.label': 'Loading conversation',
        'activity.summarizing.label': 'Summarizing conversation',
        'activity.connecting-mcp.label': 'Connecting to MCP servers',
        'activity.building-toolkit.label': 'Assembling tools',
        'activity.encoding-prompt.label': 'Encoding prompt',
        'activity.contacting-provider.label': 'Contacting inference provider',
        'activity.generating.label': 'Generating',
        'activity.calling-tool.label': 'Calling tool {{detail}}',
        'activity.waking.seconds.label_one': 'Waking up in {{count}} second',
        'activity.waking.seconds.label_other': 'Waking up in {{count}} seconds',
        'activity.waking.minutes.label_one': 'Waking up in {{count}} minute',
        'activity.waking.minutes.label_other': 'Waking up in {{count}} minutes',
        'activity.waking.hours.label_one': 'Waking up in {{count}} hour',
        'activity.waking.hours.label_other': 'Waking up in {{count}} hours',
        'activity.sleeping.label': 'Waiting to wake',
        'activity.attempt': 'attempt {{attempt}}',

        'assistant-dialog.title': 'Assistant',
        'open-assistant.label': 'Open assistant',
        'import-compute-operations.label': 'Import compute operations',
        'set-trace-panel-debug.label': 'Toggle trace panel debug view',

        'no-results.message': 'No results',

        'cancel-queued.button': 'Remove from queue',
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

        'question-actions.label': 'Question actions',
        'question-failed.message': 'That answer could not be saved. Try again.',
        'question-stranded.message': 'Answer saved, but the assistant could not be resumed.',

        'plugin-prompt.title': 'Enable {{plugin}}',
        'plugin-prompt.description': 'This action needs the {{plugin}} plugin. Enable it to continue.',
        'plugin-prompt.enabled': '{{plugin}} is enabled.',
        'plugin-prompt.unavailable': '{{plugin}} is not installed on this device.',
        'plugin-prompt.failed': 'Could not enable {{plugin}}. Try again from the plugin registry.',
        'plugin-prompt.button': 'Enable',
        'plugin-url-prompt.title': 'Load {{plugin}}',
        'plugin-url-prompt.default.name': 'plugin',
        'plugin-url-prompt.description':
          'Load {{plugin}} from this URL, then enable it in Plugins. It runs inside the app, so load only code you trust.',
        'plugin-url-prompt.loaded': '{{plugin}} is loaded. Enable it in Plugins.',
        'plugin-url-prompt.failed': 'Could not load the plugin: {{error}}',
        'plugin-url-prompt.button': 'Load plugin',

        'search.placeholder': 'Search...',
        'prompt.placeholder': '/ for skills, @ for content',
        'add-menu.button': 'Add',
        'add-files.label': 'Add files or photos',
        'add-object.menu': 'Add object…',
        'add-object.title': 'Add object',
        'commands-and-skills.label': 'Commands and skills',
        'connectors.label': 'Connectors',
        'connections-manage.label': 'Manage connections…',
        'connectors-empty.label': 'No connectors with MCP servers',
        'agent-picker.label': 'Agent',
        'model-picker.models.label': 'Models',
        'agent-setting-default.label': 'Default',
        'agent-setting.agentModel.label': 'Model',
        'agent-setting.agentModel.locked.label': 'Model (fixed once the chat has started)',
        'agent-setting.agentEffort.label': 'Effort',
        'agent-setting.agentEffort.locked.label': 'Effort (fixed once the chat has started)',
        'agent-setting.agentMode.label': 'Permissions',
        'agent-setting.agentMode.locked.label': 'Permissions (fixed once the chat has started)',
        'model-picker.environment.label': 'Agent runs on',
        'send.label': 'Send',
        'prompt-options.label': 'Prompt options',
        'prompt-controls.label': 'Prompt controls',
        'cancel-processing.button': 'Stop processing',
        'tasks-drawer.label': 'Tasks',
        'context-drawer.label': 'Context',
        'details.context.title': 'Context',
        'details.objects.label': 'Objects',
        'details.skills.label': 'Skills',
        'remove-skill.label': 'Remove skill',

        'agent-locked.message': 'The agent is chosen before the first message. Start a new chat to use another.',
        'remove-object.label': 'Remove object',

        'chat-view.title': 'View',
        'chat-view.normal.label': 'Normal',
        'chat-view.summary.label': 'Summary',
        'chat-view.thinking.label': 'Thinking',
        'chat-view.debug.label': 'Debug',
        'chat-environment.local.label': 'This device',
        'chat-environment.edge.label': 'EDGE',
        'attachments-cancel.label': 'Cancel attaching',
        'attachments-failed.label': "Couldn't attach",
        'attachments-pending.label': 'Attaching',
        'mcp-server-error.label': 'MCP server unavailable',
        'mcp-server-error.unauthorized': 'Sign-in required — the connection needs signing in again.',
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
        'model-unavailable.label': '{{label}} (unavailable)',
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
        'space-home.suggestion-kanban.label': 'Create a kanban view for tracking tasks',
        'space-home.prompt.placeholder': 'Ask the assistant anything…',

        'nav-tree-group-ai.label': 'Assistant',
      },
    },
  },
];
