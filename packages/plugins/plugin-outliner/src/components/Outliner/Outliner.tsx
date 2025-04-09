//
// Copyright 2025 DXOS.org
//

import React, {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getLabel, getSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DropdownMenu, Icon, IconButton, Input, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import { Tree, type TreeType, type TreeNodeType } from '../../types';
import {
  type CursorPosition,
  type NodeEditorProps,
  NodeEditor,
  type NodeEditorController,
  type NodeEditorEvent,
} from '../NodeEditor';

type OutlinerController = {
  focus: (id: string | undefined) => void;
};

type OutlinerAction = {
  action: string;
  node: TreeNodeType;
};

type OutlinerRootProps = ThemedClassName<{
  tree?: TreeType;
  onCreate?: () => TreeNodeType;
  onDelete?: (node: TreeNodeType) => boolean | void;
  onAction?: (action: OutlinerAction) => void;
}>;

const OutlinerRoot = forwardRef<OutlinerController, OutlinerRootProps>(
  ({ classNames, tree, onCreate, onDelete, onAction }, forwardedRef) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<string | undefined>();
    const model = useMemo(() => (tree ? new Tree(tree) : undefined), [tree]);

    const [editor, setEditor] = useState<NodeEditorController | null>(null);
    // TOOD(burdon): Should maintain goal column.
    const [position, setPosition] = useState<CursorPosition | undefined>();
    useEffect(() => {
      editor?.focus(position);
    }, [editor, position]);

    // Create first item if empty.
    useEffect(() => {
      if (model?.root.children.length === 0) {
        model.addNode(model.root);
      }
    }, [model?.size]);

    // External controller.
    useImperativeHandle(
      forwardedRef,
      () => ({
        focus: (id) => {
          log('focus', { id });
          setActive(id);
        },
      }),
      [],
    );

    const handleEvent = useCallback<NonNullable<NodeListProps['onEvent']>>(
      (event) => {
        if (!model) {
          return;
        }

        log('handleEvent', { event });
        const { type, parent, node } = event;
        invariant(parent);
        const nodes = model.getChildNodes(parent);

        switch (type) {
          //
          // Action.
          //
          case 'action': {
            const { action, node } = event;
            onAction?.({ action, node });
            break;
          }

          //
          // Focus.
          //
          case 'focus': {
            if (event.focusing) {
              setActive(node.id);
            } else {
              setActive(undefined);
            }
            break;
          }

          //
          // Create.
          //
          case 'create': {
            const created = onCreate?.();
            if (created) {
              const idx = nodes.findIndex((n) => n.id === node.id);
              model.addNode(parent, created, idx + (event.direction === 'previous' ? 0 : 1));
              setActive(created.id);
            }
            break;
          }

          //
          // Delete.
          // TODO(burdon): Cascade delete or preserve children?
          //
          case 'delete': {
            if (onDelete?.(node) !== false) {
              const previous = model.getPrevious(node);
              const deleted = model.deleteNode(parent, node.id);
              if (deleted && previous) {
                setTimeout(() => {
                  setPosition({ line: 'last' });
                  setActive(previous.id);
                });
              }
            }
            break;
          }

          //
          // Indent.
          // TOOD(burdon): Copy/paste/undo.
          // TODO(burdon): Atomic?
          //
          case 'indent': {
            switch (event.direction) {
              case 'previous': {
                model.unindentNode(node);
                setActive(node.id);
                break;
              }

              case 'next': {
                model.indentNode(node);
                setActive(node.id);
                break;
              }
            }
            break;
          }

          //
          // Move.
          //
          case 'move': {
            const idx = parent.children.findIndex((id) => id === node.id);
            switch (event.direction) {
              case 'previous': {
                if (idx > 0) {
                  model.moveNode(parent, idx, idx - 1);
                }
                break;
              }

              case 'next': {
                if (idx < parent.children.length - 1) {
                  model.moveNode(parent, idx, idx + 1);
                }
                break;
              }
            }
            break;
          }

          //
          // Navigate hierarchy.
          //
          case 'navigate': {
            switch (event.direction) {
              case 'previous': {
                const previous = model.getPrevious(node);
                if (previous && previous.id !== model.root.id) {
                  setActive(previous.id);
                  setPosition(event);
                }
                break;
              }

              case 'next': {
                const next = model.getNext(node);
                if (next) {
                  setActive(next.id);
                  setPosition(event);
                }
                break;
              }
            }
            break;
          }
        }
      },
      [model, onCreate, onDelete, onAction],
    );

    // TODO(burdon): Convert to grid.
    // TODO(burdon): Expand/collapse sub-lists.
    return (
      <div className={mx('flex flex-col overflow-hidden', classNames)}>
        <div ref={scrollRef} className='flex flex-col overflow-y-auto scrollbar-thin'>
          {model && (
            <NodeList
              model={model}
              parent={model.root}
              level={0}
              active={active}
              setEditor={setEditor}
              onEvent={handleEvent}
            />
          )}
        </div>
      </div>
    );
  },
);

//
// ChildNodes
//

type NodeListProps = {
  model: Tree;
  parent: TreeNodeType;
  level: number;
  active?: string;
  setEditor: (editor: NodeEditorController) => void;
  onEvent: (event: NodeEditorEvent & { parent: TreeNodeType }) => void;
} & Pick<NodeEditorProps, 'readOnly'>;

const NodeList = ({ model, parent, level, setEditor, active, onEvent, ...props }: NodeListProps) => {
  const handleEvent = useCallback<NonNullable<OutlinerRowProps['onEvent']>>(
    (event) => {
      onEvent?.({ ...event, parent });
    },
    [onEvent],
  );

  return model.getChildNodes(parent).map((node, i) => (
    <Fragment key={node.id}>
      <OutlinerRow
        ref={node.id === active ? setEditor : null}
        node={node}
        active={node.id === active}
        level={level}
        placeholder={level === 0 && i === 0}
        onEvent={handleEvent}
        {...props}
      />
      <NodeList
        model={model}
        parent={node}
        level={level + 1}
        active={active}
        setEditor={setEditor}
        onEvent={onEvent}
        {...props}
      />
    </Fragment>
  ));
};

//
// Row
//

type OutlinerRowProps = ThemedClassName<
  {
    node: TreeNodeType;
    level: number;
    active?: boolean;
    placeholder?: boolean;
  } & Pick<NodeEditorProps, 'readOnly' | 'onEvent'>
>;

const OutlinerRow = forwardRef<NodeEditorController, OutlinerRowProps>(
  ({ classNames, node, level, active, placeholder, readOnly, onEvent }, forwardedRef) => {
    const { t } = useTranslation(OUTLINER_PLUGIN);

    let linkText: string | undefined;
    if (node.ref) {
      const schema = getSchema(node.ref.target);
      if (schema) {
        linkText = getLabel(schema, node.ref.target);
      }
    }

    return (
      <div className={mx('flex w-full', classNames)}>
        <div className={mx('pis-2', 'border-l-4', active ? 'border-primary-500' : 'border-transparent text-subdued')}>
          <div className='flex shrink-0 w-[24px] pt-[8px] justify-center' style={{ marginLeft: level * 24 }}>
            <Input.Root>
              <Input.Checkbox
                size={4}
                disabled={!!node.ref?.target}
                checked={node.ref?.target?.data?.checked ?? node.data.checked}
                onCheckedChange={(checked) => {
                  node.data.checked = checked;
                }}
              />
            </Input.Root>
          </div>
        </div>

        <NodeEditor
          ref={forwardedRef}
          classNames='pis-1 pie-1 pbs-1 pbe-1'
          node={node}
          readOnly={node.ref?.target ? true : readOnly}
          placeholder={placeholder ? t('text placeholder') : undefined}
          onEvent={onEvent}
        />
        {linkText && (
          <a className='px-1 py-2 items-center text-primary-500' href='#'>
            <Icon icon='ph--link--regular' size={4} />
          </a>
        )}

        <div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <IconButton
                classNames={mx('opacity-20 hover:opacity-100', active && 'opacity-100')}
                icon='ph--dots-three-vertical--regular'
                iconOnly
                variant='ghost'
                label={t('menu label')}
              />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content side='top'>
                <DropdownMenu.Viewport>
                  {/* TODO(burdon): Move to plugin-task. */}
                  {!node.ref?.target && (
                    <DropdownMenu.Item onClick={() => onEvent?.({ type: 'action', node, action: 'task' })}>
                      {t('task action')}
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Item onClick={() => onEvent?.({ type: 'delete', node })}>
                    {t('delete object label')}
                  </DropdownMenu.Item>
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    );
  },
);

export const Outliner = {
  Root: OutlinerRoot,
  Editor: NodeEditor,
};

export type { OutlinerRootProps, OutlinerController, NodeEditorProps };
