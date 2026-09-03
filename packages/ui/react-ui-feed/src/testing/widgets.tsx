//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, IconBlock } from '@dxos/react-ui';
import { TogglePanel } from '@dxos/react-ui-components';
import { type XmlWidgetProps, type XmlWidgetRegistry, getXmlTextChild } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { useWidgetState } from '../components/index.ts';

/**
 * Widgets for the block kinds an assistant turn contains.
 *
 * Approximations of `plugin-assistant`'s, deliberately: what the engine has to prove is that a
 * per-message document can carry block widgets at all — that they mount, measure and survive
 * streaming — not that these are the widgets the plugin will ship. The real ones move down when the
 * plugin does.
 *
 * Every widget renders from the tag alone. The plugin keeps tool state beside the document and
 * re-applies it after a remount; an item here is rebuilt from its message, so state that is not in
 * the document has nowhere to survive.
 */

/**
 * A collapsible block: the header is what the reader sees while scrolling past, the body is what
 * they open when they care. Reasoning and tool traces are long, incidental and frequent — rendering
 * them expanded turns a chat into a log.
 *
 * The disclosure animates, and every frame of it is measured twice — by CodeMirror, to re-place the
 * lines under the widget, and by the virtualizer, to re-place the rows under the item. That is what
 * it costs for the content below to travel with the panel instead of jumping to its new place; the
 * geometry stays consistent because `MarkdownBlock` re-measures the document as the widget resizes.
 */
const Panel = ({
  stateKey,
  icon,
  title,
  children,
  classNames,
}: {
  /** Identifies this panel within its message, so its open flag can outlive the row. */
  stateKey: string;
  icon: string;
  title: string;
  children: React.ReactNode;
  classNames?: string;
}) => {
  const [open, setOpen] = useWidgetState(stateKey, false);

  return (
    // The open flag is published to the DOM so a test can ask whether it survived the row being
    // unmounted — which is the whole question a virtualized feed raises about widget state.
    <div data-testid='feed.widget' data-open={open}>
      <TogglePanel.Root open={open} onChangeOpen={setOpen}>
        {/* A minimum height, not a fixed one: the widget's content is portaled and paints after
          CodeMirror has placed the box, so without a floor the row is measured empty and grows a
          frame later — a row jumping under the reader. `estimatedHeight` in the registry looks like
          the answer and is not: it sets `height` and `overflow: hidden` on the widget root, which
          pins the panel shut. */}
        <TogglePanel.Content classNames={mx('min-h-[2.125rem] rounded border border-subdued-separator', classNames)}>
          <TogglePanel.Header classNames='flex items-center gap-2 px-2 py-1 text-sm'>
            <span className='grow text-description truncate'>{title}</span>
            <IconBlock>
              <Icon icon={icon} size={4} />
            </IconBlock>
          </TogglePanel.Header>
          <TogglePanel.Body>
            <TogglePanel.Viewport classNames='px-2 pb-1 text-sm'>{children}</TogglePanel.Viewport>
          </TogglePanel.Body>
        </TogglePanel.Content>
      </TogglePanel.Root>
    </div>
  );
};

const Frame = ({ icon, title, children, classNames }: XmlWidgetProps<any> & { classNames?: string }) => (
  <div className={mx('flex gap-2 px-2 py-1 rounded border border-subdued-separator text-sm', classNames)}>
    {icon && <Icon icon={icon} size={4} classNames='mt-1 shrink-0 text-description' />}
    <div className='min-w-0'>
      {title && <p className='text-xs text-description'>{title}</p>}
      {children}
    </div>
  </div>
);

const Reasoning = ({ children, range }: XmlWidgetProps) => {
  const text = getXmlTextChild(children ?? []) ?? '';
  return (
    <Panel
      stateKey={`reasoning:${range?.from}`}
      icon='ph--brain--regular'
      title={text.slice(0, 80)}
      classNames='opacity-70'
    >
      <p>{text}</p>
    </Panel>
  );
};

const Status = ({ children }: XmlWidgetProps) => (
  <p className='px-2 py-1 text-sm text-description animate-pulse'>{getXmlTextChild(children ?? [])}</p>
);

const ToolCall = ({ name, pending, range }: XmlWidgetProps<{ name?: string; pending?: string }>) => (
  <Panel
    stateKey={`toolCall:${range?.from}`}
    icon={pending ? 'ph--circle-notch--regular' : 'ph--wrench--regular'}
    title={`Calling ${name}`}
  >
    <p className='font-mono text-xs'>{name}</p>
  </Panel>
);

const ToolResult = ({ children, for: tool, range }: XmlWidgetProps<{ for?: string }>) => (
  <Panel stateKey={`toolResult:${range?.from}`} icon='ph--check--regular' title={`${tool} returned`}>
    <p className='font-mono text-xs'>{getXmlTextChild(children ?? [])}</p>
  </Panel>
);

// Inline, so a run of them wraps as chips rather than stacking one per line.
const Suggestion = ({ children }: XmlWidgetProps) => (
  <button type='button' className='me-1 px-2 py-0.5 rounded-full border border-separator text-sm'>
    {getXmlTextChild(children ?? [])}
  </button>
);

const Select = ({ children }: XmlWidgetProps) => {
  const options = (children ?? [])
    .map((option: any) => option?._tag === 'option' && getXmlTextChild(option.children))
    .filter(Boolean) as string[];

  return (
    <div className='flex flex-col gap-1 py-1'>
      {options.map((option) => (
        <button key={option} type='button' className='px-2 py-1 text-left rounded border border-separator text-sm'>
          {option}
        </button>
      ))}
    </div>
  );
};

const Json = ({ children }: XmlWidgetProps) => (
  <pre className='px-2 py-1 overflow-x-auto rounded bg-input-surface text-xs'>{getXmlTextChild(children ?? [])}</pre>
);

/**
 * Floor for a panel's collapsed height, reserved before its portaled content paints.
 *
 * `heightMode: 'min'` is what makes this a floor rather than a pin — the default pins the box and
 * clips it, so an opened panel stays shut. Without any reservation the row is measured at the height
 * of an empty box and grows a frame later, which is a row moving under a reader scrolling up.
 */
const COLLAPSED_HEIGHT = 42;

export const chatRegistry: XmlWidgetRegistry = {
  // No widget: the reader's own words stay in the document, where they can be selected and searched
  // like any other text. Registered so the markdown parser keeps the tag as one block — an
  // unregistered tag opens a paragraph that swallows the lines after it.
  prompt: { block: true },
  reasoning: {
    block: true,
    streaming: true,
    estimatedHeight: () => COLLAPSED_HEIGHT,
    heightMode: 'min',
    Component: Reasoning,
  },
  status: {
    block: true,
    streaming: true,
    estimatedHeight: () => COLLAPSED_HEIGHT,
    heightMode: 'min',
    Component: Status,
  },
  toolCall: { block: true, estimatedHeight: () => COLLAPSED_HEIGHT, heightMode: 'min', Component: ToolCall },
  toolResult: { block: true, estimatedHeight: () => COLLAPSED_HEIGHT, heightMode: 'min', Component: ToolResult },
  suggestion: { block: false, Component: Suggestion },
  select: { block: true, Component: Select },
  json: { block: true, Component: Json },
};
