//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, useMemo, useState } from 'react';

import * as Effect from 'effect/Effect';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';

import { AiService } from '@dxos/ai';
import { useComputeRuntimeCallback } from '@dxos/plugin-automation/hooks';
import { log } from '@dxos/log';
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

type RegistryKey = keyof typeof COMPONENT_REGISTRY;

const pascalSegmentToKebab = (segment: string): string =>
  segment
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

/** HTML custom tag for a registry key (e.g. Panel.Root → dxui-panel-root). */
export const componentRegistryKeyToTagName = (key: string): string => {
  if (key.includes('.')) {
    return 'dxui-' + key.split('.').map(pascalSegmentToKebab).join('-');
  }
  return 'dxui-' + pascalSegmentToKebab(key);
};

const TAG_NAME_TO_REGISTRY_KEY: Record<string, RegistryKey> = Object.fromEntries(
  (Object.keys(COMPONENT_REGISTRY) as RegistryKey[]).map((registryKey) => [
    componentRegistryKeyToTagName(registryKey),
    registryKey,
  ]),
) as Record<string, RegistryKey>;

const buildGenUiSystemPrompt = (): string => {
  const catalog = (Object.keys(COMPONENT_REGISTRY) as RegistryKey[])
    .sort()
    .map((key) => `  - <${componentRegistryKeyToTagName(key)}> — react-ui ${key}`)
    .join('\n');

  return trim`
    You generate HTML fragments that describe DXOS react-ui layouts using custom elements.
    The preview maps each custom tag to the matching @dxos/react-ui component.

    Tag naming: every component is a hyphenated custom element with the prefix dxui-, derived from
    the registry key by splitting on "." and converting each segment from PascalCase to kebab-case
    (e.g. Panel.Root → dxui-panel-root, Toolbar.IconButton → dxui-toolbar-icon-button, IconButton → dxui-icon-button).

    Rules:
    - Prefer semantic nesting that matches React usage: wrap Input.TextInput and Input.Label in Input.Root.
    - Use standard HTML attributes; they become React props (class → className). Use kebab-case for multi-word HTML attributes where needed (e.g. icon-only for Toolbar.IconButton iconOnly).
    - Icon and Toolbar.IconButton require icon="…" using DXOS icon ids (e.g. ph--user--regular, ph--play--regular).
    - Button and Toolbar.Button accept variant="default" | "primary" | "outline" | "ghost" | "destructive".
    - Grid accepts cols="2" (number as string) for column count.
    - Output a single HTML fragment only (no markdown fences unless the user asked for markdown). No script tags.

    Supported tags:
${catalog}

    Examples:

    1) Panel shell with toolbar and body:
    <dxui-panel-root>
      <dxui-panel-toolbar>
        <dxui-toolbar-root>
          <dxui-toolbar-text>Settings</dxui-toolbar-text>
          <dxui-toolbar-icon-button icon="ph--x--regular" label="Close" icon-only></dxui-toolbar-icon-button>
        </dxui-toolbar-root>
      </dxui-panel-toolbar>
      <dxui-panel-content>
        <p>Main content.</p>
      </dxui-panel-content>
    </dxui-panel-root>

    2) Card with heading and text:
    <dxui-card-root>
      <dxui-card-toolbar>
        <dxui-toolbar-root>
          <dxui-toolbar-text>Notes</dxui-toolbar-text>
        </dxui-toolbar-root>
      </dxui-card-toolbar>
      <dxui-card-content>
        <dxui-card-heading>Today</dxui-card-heading>
        <dxui-card-text>Remember to sync your space.</dxui-card-text>
      </dxui-card-content>
    </dxui-card-root>

    3) Form row with labeled input (Input.Root wraps field parts):
    <dxui-input-root>
      <dxui-input-label for="email-field">Email</dxui-input-label>
      <dxui-input-text-input id="email-field" placeholder="you@example.com" type="email"></dxui-input-text-input>
      <dxui-input-description>We never share your email.</dxui-input-description>
    </dxui-input-root>

    4) Toolbar actions with separator:
    <dxui-toolbar-root>
      <dxui-toolbar-button variant="primary">Save</dxui-toolbar-button>
      <dxui-toolbar-separator></dxui-toolbar-separator>
      <dxui-toolbar-icon-button icon="ph--trash--regular" label="Delete" variant="ghost"></dxui-toolbar-icon-button>
    </dxui-toolbar-root>

    5) Grid layout with icon and plain text:
    <dxui-grid cols="2">
      <dxui-flex class="items-center gap-2">
        <dxui-icon icon="ph--info--regular"></dxui-icon>
        <span>Left column</span>
      </dxui-flex>
      <dxui-flex><span>Right column</span></dxui-flex>
    </dxui-grid>
  `;
};

const dashToCamel = (name: string): string =>
  name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const htmlAttributesToReactProps = (element: Element): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  for (const attr of element.attributes) {
    const lower = attr.name.toLowerCase();
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

const convertMarkupNode = (node: Node, key: number): React.ReactNode => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return text === '' ? null : text;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const registryKey = TAG_NAME_TO_REGISTRY_KEY[tag];
  const children = [...element.childNodes].map((child, index) => convertMarkupNode(child, index)).filter(Boolean);

  if (registryKey) {
    const Component = COMPONENT_REGISTRY[registryKey] as ComponentType<any>;
    return React.createElement(Component, { key, ...htmlAttributesToReactProps(element) }, ...children);
  }

  return React.createElement(tag, { key, ...htmlAttributesToReactProps(element) }, ...children);
};

const GenUiMarkupPreview = ({ markup }: { markup: string }) => {
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
    return [...root.childNodes].map((child, index) => convertMarkupNode(child, index));
  }, [markup]);

  return <div className='min-h-[120px] overflow-auto'>{rendered}</div>;
};

export const GenUiModule = ({ space }: ComponentProps) => {
  const [input, setInput] = useState('');
  const [markup, setMarkup] = useState('');
  const [generating, setGenerating] = useState(false);

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
              Generate an HTML fragment for this request. Use only dxui-* custom elements from the catalog and normal HTML where needed.

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
