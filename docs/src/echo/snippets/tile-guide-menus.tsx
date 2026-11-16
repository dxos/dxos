//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import {
  type ActionExecutor,
  ActionMenu,
  ActionToolbar,
  MenuBuilder,
  graphActions,
  isToolbarAction,
  useMenuBuilder,
} from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Typography from '@dxos/react-ui/Typography';

// #region toolbar
/** A toolbar built from actions: each action is a label, an icon and the function it runs. */
export const FormatToolbar = () => {
  const [last, setLast] = useState<string>();
  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'bold',
          { label: 'Bold', icon: 'ph--text-b--regular', iconOnly: true },
          () => setLast('Bold'),
        )
        .action(
          'italic',
          { label: 'Italic', icon: 'ph--text-italic--regular', iconOnly: true },
          () => setLast('Italic'),
        )
        .separator('line')
        .action(
          'share',
          {
            label: 'Share',
            icon: 'ph--share-network--regular',
            placement: { zone: 'end' },
          },
          () => setLast('Share'),
        )
        .build(),
    [],
  );

  return (
    <>
      <ActionToolbar {...menu} alwaysActive />
      <Typography.Text tone='muted'>
        {last ? `Ran ${last}` : 'Nothing run yet'}
      </Typography.Text>
    </>
  );
};
// #endregion

// #region switch
/** A switch shows its state in the toolbar; the deps rebuild the actions when the state changes. */
export const ViewToolbar = () => {
  const [wrap, setWrap] = useState(false);
  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .switch('wrap', { label: 'Word wrap', checked: wrap }, () =>
          setWrap((wrap) => !wrap),
        )
        .build(),
    [wrap],
  );

  return <ActionToolbar {...menu} alwaysActive />;
};
// #endregion

// #region menu
/** The same actions as a dropdown menu, opened by any button you pass as its child. */
export const RowMenu = () => {
  const [last, setLast] = useState<string>();
  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'rename',
          { label: 'Rename', icon: 'ph--pencil-simple--regular' },
          () => setLast('Rename'),
        )
        .action(
          'duplicate',
          { label: 'Duplicate', icon: 'ph--copy--regular' },
          () => setLast('Duplicate'),
        )
        .separator('line')
        .action('delete', { label: 'Delete', icon: 'ph--trash--regular' }, () =>
          setLast('Delete'),
        )
        .build(),
    [],
  );

  return (
    <>
      <ActionMenu {...menu}>
        <Button.Root
          icon='ph--dots-three-vertical--regular'
          label='Options'
          iconOnly
        />
      </ActionMenu>
      <Typography.Text tone='muted'>
        {last ? `Ran ${last}` : 'Nothing run yet'}
      </Typography.Text>
    </>
  );
};
// #endregion

// #region plugin
/**
 * In a plugin, the toolbar also shows the actions other plugins add to the object's node in the app graph.
 * `onAction` runs a graph action; get it from plugin-graph's `useActionRunner`.
 */
export const ObjectToolbar = ({
  attendableId,
  onAction,
}: {
  attendableId: string;
  onAction: ActionExecutor;
}) => {
  const { graph } = Hooks.useAppGraph();
  const menu = useMenuBuilder(
    (get) =>
      MenuBuilder.make()
        .action(
          'refresh',
          { label: 'Refresh', icon: 'ph--arrow-clockwise--regular' },
          () => {},
        )
        .subgraph(
          graphActions(graph, get, attendableId, { filter: isToolbarAction }),
        )
        .build(),
    [graph, attendableId],
  );

  return (
    <ActionToolbar {...menu} attendableId={attendableId} onAction={onAction} />
  );
};
// #endregion
