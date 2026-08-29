//
// Copyright 2026 DXOS.org
//

//
// SPIKE. The React renderer: one function per kind tag.
//
// Deliberately maps onto `react-ui` primitives only where the mapping is unambiguous
// (`Flex`, `Panel`, `Input`, `Button`). The point of the spike is the model, not component
// coverage — a kind whose mapping is a design question renders as plain markup here and says so.
//

import React, { type ReactNode } from 'react';

import { Button, Flex, Input, Panel } from '@dxos/react-ui';

import { type Node, type Scope } from '../model';
import { type Renderer, type RenderOptions, render } from '../render';

const asText = (value: unknown): string => (value == null ? '' : String(value));

/**
 * `gap`/`align`/`justify` come off the node's static props and are handed to `Flex` unchanged —
 * the aspect vocabulary in the template is the same closed set the primitive already takes, which
 * is the cheapest evidence that aspects belong in the model rather than in the renderer.
 */
const flexProps = (props: Readonly<Record<string, string | number | boolean>>) => ({
  column: props.direction === 'column',
  gap: props.gap as any,
  align: props.align as any,
  justify: props.justify as any,
});

export const reactRenderer: Renderer<ReactNode> = {
  container: ({ path, props, children }) => (
    <Panel.Root key={path} role='none' classNames='p-2 border border-separator rounded-sm'>
      <Panel.Content classNames='p-2'>
        <Flex column gap={(props.gap as any) ?? 'sm'}>
          {children}
        </Flex>
      </Panel.Content>
    </Panel.Root>
  ),

  layout: ({ path, props, children }) => (
    <Flex key={path} {...flexProps(props)} classNames='min-w-0'>
      {children}
    </Flex>
  ),

  display: ({ path, props, data }) => (
    <span key={path} className={props.variant === 'title' ? 'text-lg font-medium' : 'text-description'}>
      {asText(data.text)}
    </span>
  ),

  control: ({ path, props, data, handlers }) => (
    <Input.Root key={path}>
      <Input.Label>{asText(props.label)}</Input.Label>
      <Input.TextInput
        placeholder={asText(props.placeholder)}
        defaultValue={asText(data.value)}
        onBlur={handlers.commit}
      />
    </Input.Root>
  ),

  // The one kind that introduces a scope: children are rendered once per resolved item.
  collection: ({ path, data, scope, renderChildren }) => {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <Flex key={path} column gap='xs' role='list'>
        {items.map((item, index) => (
          <Flex key={index} role='listitem' gap='sm' align='center'>
            {renderChildren({ ...scope, item }, `[${index}]`)}
          </Flex>
        ))}
      </Flex>
    );
  },

  command: ({ path, children }) => (
    <Flex key={path} gap='sm' align='center' role='toolbar'>
      {children}
    </Flex>
  ),
};

/**
 * An action inside a `command`. Modelled as a `control` with a `label` and an `on-activate`
 * binding, since the spike's tag set has no `action` part — which is exactly the gap ONTOLOGY R-10
 * predicts (parts are a vocabulary distinct from kinds).
 */
export const actionRenderer: Renderer<ReactNode> = {
  ...reactRenderer,
  control: (props) =>
    props.props.as === 'button' ? (
      <Button key={props.path} onClick={props.handlers.activate}>
        {asText(props.props.label)}
      </Button>
    ) : (
      reactRenderer.control(props)
    ),
};

export type TemplateProps<State> = {
  node: Node;
  state: State;
  options?: RenderOptions;
};

/** Render a parsed template against a state object. */
export const Template = <State,>({ node, state, options }: TemplateProps<State>) => {
  const scope: Scope = { state };
  return <>{render(node, scope, actionRenderer, options)}</>;
};
