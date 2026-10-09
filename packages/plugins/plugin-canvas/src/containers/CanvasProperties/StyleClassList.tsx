//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { type StyleClass, hueClasses } from '@dxos/react-ui-canvas/scene';
import { Form } from '@dxos/react-ui-form';
import { OrderedList } from '@dxos/react-ui-list';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { mx } from '@dxos/ui-theme';

const NameSchema = Schema.Struct({
  name: Schema.String.check(Schema.isNonEmpty()).annotate({ title: 'Name' }),
});

export type StyleClassListProps = {
  classes: readonly StyleClass[];
  /** How many nodes and links take each class, by id. */
  uses: Readonly<Record<string, number>>;
  readonly?: boolean;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
};

/** The drawing's style classes: each with its look and how many elements take it; a row opens to rename it. */
export const StyleClassList = ({ classes, uses, readonly, onRename, onDelete }: StyleClassListProps) => {
  const [openId, setOpenId] = useState<string>();
  const sorted = useMemo(() => [...classes].sort((left, right) => left.name.localeCompare(right.name)), [classes]);
  return (
    <OrderedList.Root items={sorted} getLabel={(styleClass) => styleClass.name} readonly>
      {({ items }) => (
        <>
          <OrderedList.Label>Classes</OrderedList.Label>
          <OrderedList.Content data-testid='style-classes'>
            {items.map((styleClass) => {
              const hue = hueClasses(styleClass.style?.hue, styleClass.style?.tone);
              const count = uses[styleClass.id] ?? 0;
              return (
                <OrderedList.Item
                  key={styleClass.id}
                  id={styleClass.id}
                  canDrag={false}
                  open={openId === styleClass.id}
                  onOpenChange={(open) => setOpenId(open ? styleClass.id : undefined)}
                  data-testid={`style-class-${styleClass.id}`}
                >
                  <div
                    aria-hidden
                    className={mx('size-4 shrink-0 self-center rounded-sm border', hue.surface, hue.border)}
                  />
                  <OrderedList.ItemText />
                  <OrderedList.ItemDescription>{count === 1 ? '1 use' : `${count} uses`}</OrderedList.ItemDescription>
                  {!readonly && onDelete && <SystemButton.Remove onClick={() => onDelete(styleClass.id)} />}
                  <OrderedList.Detail>
                    <Form.Root
                      schema={NameSchema}
                      values={{ name: styleClass.name }}
                      readonly={readonly}
                      autoSave
                      onSave={({ name }) => onRename?.(styleClass.id, name)}
                    >
                      <Form.Fields />
                    </Form.Root>
                  </OrderedList.Detail>
                </OrderedList.Item>
              );
            })}
          </OrderedList.Content>
          <OrderedList.Empty>No classes.</OrderedList.Empty>
        </>
      )}
    </OrderedList.Root>
  );
};
