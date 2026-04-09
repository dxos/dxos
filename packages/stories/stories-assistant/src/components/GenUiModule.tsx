//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import React, {
  ReactNode,
  type ComponentType,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  createElement,
} from 'react';

import { AiService } from '@dxos/ai';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { type Operation } from '@dxos/operation';
import { useComputeRuntimeCallback } from '@dxos/plugin-automation/hooks';
import {
  Button,
  ButtonGroup,
  Card,
  Flex,
  Grid,
  Icon,
  IconButton,
  Input,
  Panel,
  Separator,
  Toolbar,
} from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { trim } from '@dxos/util';

import { type ComponentProps } from './types';

/**
 * Maps DXOS react-ui registry keys to components. Keys use compound names (e.g. Panel.Root) or
 * top-level exports (e.g. Button).
 */
export const COMPONENT_REGISTRY = {
  'Panel.Root': Panel.Root,
  'Panel.Toolbar': Panel.Toolbar,
  'Panel.Content': Panel.Content,
  'Panel.Statusbar': Panel.Statusbar,

  'Toolbar.Root': Toolbar.Root,
  'Toolbar.Text': Toolbar.Text,
  'Toolbar.Button': Toolbar.Button,
  'Toolbar.IconButton': Toolbar.IconButton,
  'Toolbar.Separator': Toolbar.Separator,
  'Toolbar.Link': Toolbar.Link,

  'Input.Root': Input.Root,
  'Input.Label': Input.Label,
  'Input.TextInput': Input.TextInput,
  'Input.TextArea': Input.TextArea,
  'Input.Description': Input.Description,

  Button,
  ButtonGroup,
  IconButton,

  'Card.Root': Card.Root,
  'Card.Toolbar': Card.Toolbar,
  'Card.Content': Card.Content,
  'Card.Heading': Card.Heading,
  'Card.Text': Card.Text,

  Flex,
  Grid,
  Separator,
  Icon,
} as const;

/** Operations available for use in on:* event handlers. */
const OPERATIONS: Operation.Definition.Any[] = [
  LayoutOperation.AddToast,
  LayoutOperation.UpdateSidebar,
  LayoutOperation.UpdateDialog,
  LayoutOperation.SetLayoutMode,
  LayoutOperation.Open,
  LayoutOperation.Close,
  LayoutOperation.ScrollIntoView,
  SettingsOperation.Open,
];

const OPERATION_BY_KEY: Record<string, Operation.Definition.Any> = Object.fromEntries(
  OPERATIONS.map((op) => [op.meta.key, op]),
);

type RegistryKey = keyof typeof COMPONENT_REGISTRY;

/** Reverse lookup from uppercase tagName (as returned by `element.tagName` in HTML mode) to registry key. */
const TAG_NAME_TO_REGISTRY_KEY: Record<string, RegistryKey> = Object.fromEntries(
  (Object.keys(COMPONENT_REGISTRY) as RegistryKey[]).map((key) => [key.toUpperCase(), key]),
) as Record<string, RegistryKey>;

const buildGenUiSystemPrompt = (): string => {
  const componentCatalog = (Object.keys(COMPONENT_REGISTRY) as RegistryKey[])
    .sort()
    .map((key) => `  - <${key}>`)
    .join('\n');

  const operationCatalog = OPERATIONS.map(
    (op) => `  - ${op.meta.key} — ${op.meta.description ?? op.meta.name ?? ''}`,
  ).join('\n');

  return trim`
    You generate HTML fragments that describe DXOS react-ui layouts.
    The preview renderer maps each tag to the matching @dxos/react-ui component.

    Tag naming: use the exact component name as the HTML element name.
    Compound components use dot notation (e.g. <Panel.Root>, <Toolbar.IconButton>).
    Top-level components use bare PascalCase (e.g. <Button>, <Grid>).
    HTML parsers handle dots in tag names — this is intentional.

    Rules:
    - Prefer semantic nesting that matches React usage: wrap Input.TextInput and Input.Label in Input.Root.
    - Use standard HTML attributes; they become React props (class → className). Use kebab-case for multi-word HTML attributes where needed (e.g. icon-only for Toolbar.IconButton iconOnly).
    - Icon and Toolbar.IconButton require icon="…" using Phosphor icon ids (e.g. ph--user--regular, ph--play--regular).
    - Button and Toolbar.Button accept variant="default" | "primary" | "outline" | "ghost" | "destructive".
    - Grid accepts cols="2" (number as string) for column count.
    - Output a single HTML fragment only (no markdown fences). No script tags.

    Event handlers (operations):
    Any element can have on:<event> attributes that invoke DXOS operations when the event fires.

    Syntax:  on:<event>='<operation-key>(<json-args>)'
    - <event> is a DOM event name: click, mouseenter, mouseleave, focus, blur, etc.
      It maps to the corresponding React prop (on:click → onClick, on:mouseenter → onMouseEnter).
    - <operation-key> is the full dotted key from the operations list below.
    - (<json-args>) is a JSON object literal with the operation's input fields.
      The JSON uses double quotes inside; wrap the whole attribute value in single quotes.
    - For operations that take no input, use empty parens: on:click='some.operation()'

    Example attribute:
      on:click='org.dxos.plugin.layout.operation.add-toast({"id":"t1","title":"Done!"})'

    Supported tags:
${componentCatalog}

    Available operations (use the key as-is in on:* attributes):

${operationCatalog}

    Operation argument reference:
    - add-toast: {"id":"<unique>", "title":"<text>", "description":"<text>", "icon":"<phosphor-id>", "duration":<ms>}
      id and title are required. description, icon, duration are optional.
    - update-sidebar: {"state":"closed"|"collapsed"|"expanded"}
    - update-dialog: {"state":true|false} — true opens, false closes.
    - set-layout-mode: {"mode":"<mode>"} — e.g. "solo", "deck".
    - open: {"subject":["<item-id>"]} — opens items in the main area.
    - close: {"subject":["<item-id>"]} — closes items.
    - scroll-into-view: {"subject":"<item-id>"}
    - settings open: {} — no args needed, opens the settings panel.

    Examples:

    1) Panel with a close button that collapses the sidebar:
    <Panel.Root>
      <Panel.Toolbar>
        <Toolbar.Root>
          <Toolbar.Text>Settings</Toolbar.Text>
          <Toolbar.IconButton
            icon="ph--x--regular"
            label="Close sidebar"
            icon-only
            on:click='org.dxos.plugin.layout.operation.update-sidebar({"state":"closed"})'
          ></Toolbar.IconButton>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <p>Main content goes here.</p>
      </Panel.Content>
    </Panel.Root>

    2) Button that shows a toast notification:
    <Button on:click='org.dxos.plugin.layout.operation.add-toast({"id":"hello","title":"Hello!","description":"Toast from generated UI"})'>
      Show Toast
    </Button>

    3) Card with an action button that opens settings:
    <Card.Root>
      <Card.Toolbar>
        <Toolbar.Root>
          <Toolbar.Text>Quick Actions</Toolbar.Text>
          <Toolbar.IconButton
            icon="ph--gear--regular"
            label="Settings"
            on:click='org.dxos.plugin.settings.operation.open({})'
          ></Toolbar.IconButton>
        </Toolbar.Root>
      </Card.Toolbar>
      <Card.Content>
        <Card.Text>Click the gear icon to open settings.</Card.Text>
      </Card.Content>
    </Card.Root>

    4) Toolbar with save (toast) and delete (dialog) actions:
    <Toolbar.Root>
      <Toolbar.Button
        variant="primary"
        on:click='org.dxos.plugin.layout.operation.add-toast({"id":"saved","title":"Saved","description":"Your changes have been saved."})'
      >Save</Toolbar.Button>
      <Toolbar.Separator></Toolbar.Separator>
      <Toolbar.IconButton
        icon="ph--trash--regular"
        label="Delete"
        variant="destructive"
        on:click='org.dxos.plugin.layout.operation.update-dialog({"state":true})'
      ></Toolbar.IconButton>
    </Toolbar.Root>

    5) Grid with sidebar toggle and layout mode switch:
    <Grid cols="2">
      <Button
        variant="outline"
        on:click='org.dxos.plugin.layout.operation.update-sidebar({"state":"expanded"})'
      >Expand Sidebar</Button>
      <Button
        variant="outline"
        on:click='org.dxos.plugin.layout.operation.set-layout-mode({"mode":"solo"})'
      >Solo Mode</Button>
    </Grid>
  `;
};

type InvokerFn = (op: Operation.Definition.Any, input: unknown) => void;

const InvokerContext = createContext<InvokerFn | null>(null);

/**
 * Parses an operation invocation string: `<operation-key>(<json-args>)`.
 * Returns null if the string doesn't match the expected format.
 */
const parseOperationInvocation = (value: string): { key: string; args: unknown } | null => {
  const parenIdx = value.indexOf('(');
  if (parenIdx === -1 || !value.endsWith(')')) {
    return null;
  }
  const key = value.slice(0, parenIdx).trim();
  const argsStr = value.slice(parenIdx + 1, -1);
  try {
    return { key, args: argsStr.trim() === '' ? undefined : JSON.parse(argsStr) };
  } catch {
    log.warn('failed to parse operation args', { value });
    return null;
  }
};

/** Maps `on:click` → `onClick`, `on:mouseenter` → `onMouseEnter`, etc. */
const eventAttrToReactProp = (attrName: string): string => {
  const eventName = attrName.slice(3); // strip "on:"
  return 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
};

const dashToCamel = (name: string): string => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const htmlAttributesToReactProps = (element: Element, invoker: InvokerFn | null): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  for (const attr of element.attributes) {
    const lower = attr.name.toLowerCase();

    if (lower.startsWith('on:') && invoker) {
      const parsed = parseOperationInvocation(attr.value);
      if (parsed) {
        const operation = OPERATION_BY_KEY[parsed.key];
        if (operation) {
          const reactProp = eventAttrToReactProp(lower);
          const capturedArgs = parsed.args;
          props[reactProp] = () => invoker(operation, capturedArgs);
        } else {
          log.warn('unknown operation in event handler', { key: parsed.key });
        }
      }
      continue;
    }

    if (lower === 'class') {
      props.className = attr.value;
      continue;
    }
    if (lower === 'for') {
      props.htmlFor = attr.value;
      continue;
    }
    if (lower === 'icon-only' || lower === 'icononly') {
      props.iconOnly = true;
      continue;
    }
    const prop = dashToCamel(lower);
    if (lower === 'cols' || lower === 'rows') {
      props[prop] = Number(attr.value);
      continue;
    }
    if (attr.value === '' && (lower === 'disabled' || lower === 'readonly' || lower === 'checked')) {
      props[prop] = true;
      continue;
    }
    props[prop] = attr.value;
  }
  return props;
};

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const convertMarkupNode = (node: Node, key: number, invoker: InvokerFn | null): ReactNode => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return text === '' ? null : text;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const registryKey = TAG_NAME_TO_REGISTRY_KEY[element.tagName];
  const children = [...element.childNodes]
    .map((child, index) => convertMarkupNode(child, index, invoker))
    .filter(Boolean);
  const props = { key, ...htmlAttributesToReactProps(element, invoker) };

  if (registryKey) {
    const Component = COMPONENT_REGISTRY[registryKey] as ComponentType<any>;
    return createElement(Component, props, ...children);
  }

  const tag = element.tagName.toLowerCase();
  if (VOID_ELEMENTS.has(tag)) {
    return createElement(tag, props);
  }

  return createElement(tag, props, ...children);
};

const GenUiMarkupPreview = ({ markup }: { markup: string }) => {
  const invoker = useContext(InvokerContext);
  const rendered = useMemo(() => {
    if (!markup.trim()) {
      return null;
    }
    const wrapped = `<div data-gen-ui-root="true">${markup}</div>`;
    const doc = new DOMParser().parseFromString(wrapped, 'text/html');
    const root = doc.querySelector('[data-gen-ui-root="true"]');
    if (!root) {
      return null;
    }
    return [...root.childNodes].map((child, index) => convertMarkupNode(child, index, invoker));
  }, [markup, invoker]);

  return <div className='min-h-[120px] overflow-auto'>{rendered}</div>;
};

export const GenUiModule = ({ space }: ComponentProps) => {
  const [input, setInput] = useState('');
  const [markup, setMarkup] = useState('');
  const [generating, setGenerating] = useState(false);
  const { invokePromise } = useOperationInvoker();

  const invokerFn: InvokerFn = useCallback((op, args) => void invokePromise(op, args), [invokePromise]);

  const handleGenerate = useComputeRuntimeCallback(
    space.id,
    () =>
      Effect.gen(function* () {
        setGenerating(true);
        const nextMarkup = yield* generateMarkup(input).pipe(
          Effect.provide(AiService.model('@anthropic/claude-haiku-4-5')),
        );
        setMarkup(nextMarkup);
        setGenerating(false);
      }),
    [input],
  );

  return (
    <InvokerContext.Provider value={invokerFn}>
      <Panel.Root>
        {/* TODO(burdon): Chat.Toolbar => Menu.Root which doesn't handle slot. Need to audit Root components. */}
        <Panel.Toolbar>
          <Toolbar.Root>
            <Input.Root>
              <Input.TextInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
                onSubmit={handleGenerate}
                disabled={generating}
              />
            </Input.Root>
            <Toolbar.IconButton
              icon='ph--play--regular'
              label='Generate'
              iconOnly
              onClick={handleGenerate}
              disabled={generating}
            />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Grid cols={2}>
            <SyntaxHighlighter language='html'>{markup}</SyntaxHighlighter>
            <GenUiMarkupPreview markup={markup} />
          </Grid>
        </Panel.Content>
      </Panel.Root>
    </InvokerContext.Provider>
  );
};

const generateMarkup = (input: string) =>
  Effect.gen(function* () {
    log.info('generateMarkup', { input });
    const prompt = Prompt.fromMessages([
      Prompt.makeMessage('system', { content: buildGenUiSystemPrompt() }),
      Prompt.makeMessage('user', {
        content: [
          Prompt.makePart('text', {
            text: trim`
              Generate an HTML fragment for this request. Use component tags from the catalog and normal HTML where needed. Wire up on:* event handlers to invoke operations where appropriate.

              Request: ${input}
            `,
          }),
        ],
      }),
    ]);
    const response = yield* LanguageModel.generateText({ prompt });
    log.info('response', { response: response.text });
    let nextMarkup = response.text;
    nextMarkup = nextMarkup.replace(/^.*```html\n/gm, '').replace(/\n```.*$/gm, '');
    const htmlClose = nextMarkup.match(/<\/html>/i);
    if (htmlClose?.index !== undefined) {
      nextMarkup = nextMarkup.slice(0, htmlClose.index + htmlClose[0].length);
    }
    return nextMarkup;
  });
