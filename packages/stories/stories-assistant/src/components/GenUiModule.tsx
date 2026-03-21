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

/** Reverse lookup from uppercase tagName (as returned by `element.tagName` in HTML mode) to registry key. */
const TAG_NAME_TO_REGISTRY_KEY: Record<string, RegistryKey> = Object.fromEntries(
  (Object.keys(COMPONENT_REGISTRY) as RegistryKey[]).map((key) => [key.toUpperCase(), key]),
) as Record<string, RegistryKey>;

const buildGenUiSystemPrompt = (): string => {
  const catalog = (Object.keys(COMPONENT_REGISTRY) as RegistryKey[])
    .sort()
    .map((key) => `  - <${key}>`)
    .join('\n');

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

    Supported tags:
${catalog}

    Examples:

    1) Panel shell with toolbar and body:
    <Panel.Root>
      <Panel.Toolbar>
        <Toolbar.Root>
          <Toolbar.Text>Settings</Toolbar.Text>
          <Toolbar.IconButton icon="ph--x--regular" label="Close" icon-only></Toolbar.IconButton>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <p>Main content goes here.</p>
      </Panel.Content>
    </Panel.Root>

    2) Card with heading and text:
    <Card.Root>
      <Card.Toolbar>
        <Toolbar.Root>
          <Toolbar.Text>Notes</Toolbar.Text>
        </Toolbar.Root>
      </Card.Toolbar>
      <Card.Content>
        <Card.Heading>Today</Card.Heading>
        <Card.Text>Remember to sync your space.</Card.Text>
      </Card.Content>
    </Card.Root>

    3) Form row with labeled input:
    <Input.Root>
      <Input.Label>Email</Input.Label>
      <Input.TextInput placeholder="you@example.com" type="email"></Input.TextInput>
      <Input.Description>We never share your email.</Input.Description>
    </Input.Root>

    4) Toolbar actions with separator:
    <Toolbar.Root>
      <Toolbar.Button variant="primary">Save</Toolbar.Button>
      <Toolbar.Separator></Toolbar.Separator>
      <Toolbar.IconButton icon="ph--trash--regular" label="Delete" variant="ghost"></Toolbar.IconButton>
    </Toolbar.Root>

    5) Grid layout with icon and plain text:
    <Grid cols="2">
      <Flex class="items-center gap-2">
        <Icon icon="ph--info--regular"></Icon>
        <span>Left column</span>
      </Flex>
      <Flex><span>Right column</span></Flex>
    </Grid>
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
  const registryKey = TAG_NAME_TO_REGISTRY_KEY[element.tagName];
  const children = [...element.childNodes].map((child, index) => convertMarkupNode(child, index)).filter(Boolean);

  if (registryKey) {
    const Component = COMPONENT_REGISTRY[registryKey] as ComponentType<any>;
    return React.createElement(Component, { key, ...htmlAttributesToReactProps(element) }, ...children);
  }

  return React.createElement(element.tagName.toLowerCase(), { key, ...htmlAttributesToReactProps(element) }, ...children);
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
              Generate an HTML fragment for this request. Use only the component tags from the catalog and normal HTML where needed.

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
