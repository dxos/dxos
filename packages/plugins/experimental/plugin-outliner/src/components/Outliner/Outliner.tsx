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

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { IconButton, Input, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { OUTLINER_PLUGIN } from '../../meta';
import { Tree, type TreeType, type TreeNodeType } from '../../types';
import { type NodeEditorProps, NodeEditor, type NodeEditorController, type NodeEditorEvent } from '../NodeEditor';

type OutlinerController = {
  focus: (id: string | undefined) => void;
};

type OutlinerRootProps = ThemedClassName<{
  tree?: TreeType;
  onCreate?: () => TreeNodeType;
  onDelete?: (node: TreeNodeType) => boolean | void;
}>;

const OutlinerRoot = forwardRef<OutlinerController, OutlinerRootProps>(
  ({ classNames, tree, onCreate, onDelete }, forwardedRef) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<string | undefined>();
    const model = useMemo(() => (tree ? new Tree(tree) : undefined), [tree]);

    const [editor, setEditor] = useState<NodeEditorController | null>(null);
    const [direction, setDirection] = useState<'start' | 'end'>();
    useEffect(() => {
      editor?.focus(direction);
    }, [editor, direction]);

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
          log.info('focus', { id });
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
              model.addNode(parent, created, idx + 1);
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
                setTimeout(() => setActive(previous.id));
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
          // case 'move': {
          //   switch (event.direction) {
          //     case 'previous': {
          //       if (index > 0) {
          //         const [node] = nodes.splice(index, 1);
          //         parent.children.splice(index, 1); // TODO(burdon): Hack -- see util.tsx
          //         parent.children.splice(index - 1, 0, node);
          //       }
          //       break;
          //     }

          //     case 'next': {
          //       if (index < parent.children.length - 1) {
          //         const [node] = nodes.splice(index, 1);
          //         parent.children.splice(index, 1); // TODO(burdon): Hack -- see util.tsx
          //         parent.children.splice(index + 1, 0, node);
          //       }
          //       break;
          //     }
          // }
          // break;
          // }

          //
          // Navigate hierarchy.
          //
          case 'navigate': {
            switch (event.direction) {
              case 'previous': {
                const previous = model.getPrevious(node);
                if (previous && previous.id !== model.root.id) {
                  setActive(previous.id);
                  setDirection('start');
                }
                break;
              }

              case 'next': {
                const next = model.getNext(node);
                if (next) {
                  setActive(next.id);
                  setDirection('end');
                }
                break;
              }
            }
            break;
          }
        }
      },
      [model],
    );

    // TODO(burdon): Convert to grid.
    // TODO(burdon): Expand/collapse sub-lists.
    return (
      <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
        <div ref={scrollRef} className='flex flex-col overflow-y-auto scrollbar-thin'>
          {model && (
            <NodeList
              model={model}
              parent={model.root}
              indent={0}
              editable={true}
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
  indent: number;
  active?: string;
  setEditor: (editor: NodeEditorController) => void;
  onEvent: (event: NodeEditorEvent & { parent: TreeNodeType }) => void;
} & Pick<NodeEditorProps, 'editable'>;

const NodeList = ({ model, parent, indent, setEditor, active, onEvent, ...props }: NodeListProps) => {
  const handleEvent = useCallback<NonNullable<OutlinerRowProps['onEvent']>>(
    (event) => {
      onEvent?.({ ...event, parent });
    },
    [onEvent],
  );

  return model.getChildNodes(parent).map((node) => (
    <Fragment key={node.id}>
      <OutlinerRow
        ref={node.id === active ? setEditor : null}
        tree={model.tree}
        node={node}
        active={node.id === active}
        indent={indent}
        onEvent={handleEvent}
        {...props}
      />
      <NodeList
        model={model}
        parent={node}
        indent={indent + 1}
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
    tree: TreeType;
    node: TreeNodeType;
    indent: number;
    active?: boolean;
  } & Pick<NodeEditorProps, 'editable' | 'onEvent'>
>;

const OutlinerRow = forwardRef<NodeEditorController, OutlinerRowProps>(
  ({ classNames, tree, node, indent, active, editable, onEvent }, forwardedRef) => {
    const { t } = useTranslation(OUTLINER_PLUGIN);
    return (
      <div className={mx('flex w-full', classNames)}>
        <div className={mx('pis-2', 'border-l-4', active ? 'border-primary-500' : 'border-transparent text-subdued')}>
          <div className='flex shrink-0 w-[24px] pt-[8px] justify-center' style={{ marginLeft: indent * 24 }}>
            <Input.Root>
              <Input.Checkbox
                size={4}
                checked={node.data.checked}
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
          tree={tree}
          node={node}
          editable={editable}
          placeholder={indent === 0 ? t('text placeholder') : undefined}
          onEvent={onEvent}
        />

        {editable && (
          <div>
            <IconButton
              classNames={mx('opacity-20 hover:opacity-100', active && 'opacity-100')}
              icon='ph--x--regular'
              iconOnly
              variant='ghost'
              label={t('delete object label')}
              onClick={() => onEvent?.({ type: 'delete', node })}
            />
          </div>
        )}
      </div>
    );
  },
);

export const Outliner = {
  Root: OutlinerRoot,
  Editor: NodeEditor,
};

export type { OutlinerRootProps, OutlinerController, NodeEditorProps };
