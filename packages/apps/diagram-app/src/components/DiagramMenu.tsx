//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React from 'react';

import { Annotation, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';

import { UNTITLED } from '../model/index.ts';
import { PillCombobox } from './PillCombobox.tsx';

/** The `Drawing` type's own icon, as Composer shows it. */
export const DIAGRAM_ICON = Annotation.IconAnnotation.get(Type.getSchema(Drawing.Drawing)).pipe(
  Option.map(({ icon }) => icon),
  Option.getOrElse(() => 'ph--compass-tool--regular'),
);

/** The shortcut that creates a diagram (spec F-4.7), as the menu shows it. */
export const NEW_DIAGRAM_SHORTCUT = '⌥N';

const NEW = 'new-diagram';
const RENAME = 'rename';
const DELETE = 'delete';

/** A drawing's name, subscribed so a rename here or in Composer shows at once. */
export const useDrawingName = (drawing: Drawing.Drawing | undefined): string => {
  const [name] = useObject(drawing, 'name');
  return name || UNTITLED;
};

/** The name a typed query gives a new diagram: none when empty or when a diagram already has it. */
const typedName = (drawings: Drawing.Drawing[], query: string): string | undefined => {
  const text = query.trim();
  const taken = drawings.some(({ name }) => (name || UNTITLED).toLowerCase() === text.toLowerCase());
  return text && !taken ? text : undefined;
};

export type DiagramMenuProps = {
  drawings: Drawing.Drawing[];
  current?: Drawing.Drawing;
  onSelect: (drawing: Drawing.Drawing) => void;
  /** Creates a diagram, named when the user typed a name that matched none. */
  onCreate: (name?: string) => void;
  onRename: (drawing: Drawing.Drawing) => void;
  onDelete: (drawing: Drawing.Drawing) => void;
};

/** The diagram half of the pill (spec F-4): a search over the space's diagrams, each with its own menu, then New diagram. */
export const DiagramMenu = ({ drawings, current, onSelect, onCreate, onRename, onDelete }: DiagramMenuProps) => {
  const name = useDrawingName(current);
  const find = (id: string) => drawings.find((drawing) => drawing.id === id);
  return (
    <PillCombobox
      trigger={
        <Button.Root variant='ghost' caretDown icon={DIAGRAM_ICON} data-testid='diagram-app.diagram-menu'>
          {current ? name : 'No diagrams'}
        </Button.Root>
      }
      width='w-90'
      placeholder='Find a diagram'
      testId='diagram-app.diagram-list'
      current={current?.id}
      entries={drawings.map((drawing) => ({
        value: drawing.id,
        label: drawing.name || UNTITLED,
        leading: <Icon.Icon icon={DIAGRAM_ICON} />,
        testId: `diagram-app.diagram.${drawing.id}`,
      }))}
      entryActions={[
        { value: RENAME, label: 'Rename…', icon: 'ph--pencil-simple--regular', testId: 'diagram-app.rename-diagram' },
        {
          value: DELETE,
          label: 'Delete',
          icon: 'ph--trash--regular',
          destructive: true,
          testId: 'diagram-app.delete-diagram',
        },
      ]}
      actions={(query) => {
        const named = typedName(drawings, query);
        return [
          {
            value: NEW,
            label: named ? `New diagram “${named}”` : 'New diagram',
            icon: 'ph--plus--regular',
            shortcut: NEW_DIAGRAM_SHORTCUT,
            testId: 'diagram-app.new-diagram',
          },
        ];
      }}
      onSelect={(id) => {
        const drawing = find(id);
        if (drawing) {
          onSelect(drawing);
        }
      }}
      onAction={(action, query) => action === NEW && onCreate(typedName(drawings, query))}
      onEntryAction={(action, id) => {
        const drawing = find(id);
        if (drawing && action === RENAME) {
          onRename(drawing);
        } else if (drawing && action === DELETE) {
          onDelete(drawing);
        }
      }}
    />
  );
};
