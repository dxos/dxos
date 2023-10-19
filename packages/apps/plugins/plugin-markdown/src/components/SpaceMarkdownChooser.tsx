//
// Copyright 2023 DXOS.org
//

// import get from 'lodash.get';
// import React, { useState } from 'react';

// import { useGraph } from '@braneframe/plugin-graph';
// import { useTreeView } from '@braneframe/plugin-treeview';
// import { Button, Dialog, Input, useTranslation } from '@dxos/react-ui';

// import { MARKDOWN_PLUGIN } from '../types';
// import { isMarkdown } from '../util';

export const SpaceMarkdownChooser = ({
  data: { omit, onDone },
}: {
  data: { onDone: (items: { id: string }[]) => void; chooser: 'one' | 'many'; omit: Set<string> };
}) => {
  // const { t } = useTranslation(MARKDOWN_PLUGIN);
  // // TODO(thure): This assumes the best & only way to get the active space is to find it in the graph using treeView, which probably won’t scale well.
  // const treeView = useTreeView();
  // const { graph } = useGraph();
  // const [plugin] = treeView.active[0]?.split('/') ?? [];
  // const nodes =
  //   Object.values(
  //     (graph.pluginChildren ?? {})[plugin].find(({ id }) => id === treeView.active[0])?.pluginChildren ?? {},
  //   )
  //     .flat()
  //     ?.filter((node) => {
  //       return isMarkdown(get(node, 'data.content')) && !omit.has(get(node, 'data.id', 'never'));
  //     }) ?? [];

  // const isEmpty = nodes.length <= 0;

  // const [selected, setSelected] = useState<Record<string, boolean>>({});

  // return (
  //   <>
  //     <Dialog.Title tabIndex={-1} classNames='mbe-2'>
  //       {t('choose markdown from space dialog title')}
  //     </Dialog.Title>
  //     {!isEmpty ? (
  //       <>
  //         {nodes.map((node) => {
  //           return (
  //             <Input.Root key={node.id}>
  //               <div role='none' className='flex items-center gap-2 mbe-2'>
  //                 <Input.Checkbox
  //                   checked={!!selected[node.id]}
  //                   onCheckedChange={(checked) => setSelected({ ...selected, [node.id]: !!checked })}
  //                 />
  //                 <Input.Label>{typeof node.label === 'string' ? node.label : t(...node.label)}</Input.Label>
  //               </div>
  //             </Input.Root>
  //           );
  //         })}
  //       </>
  //     ) : (
  //       <p className='text-center mlb-2'>{t('empty choose markdown from space message')}</p>
  //     )}
  //     <div role='none' className='flex justify-end gap-2 mbs-2'>
  //       <Dialog.Close asChild>
  //         <Button>{t('cancel label', { ns: 'os' })}</Button>
  //       </Dialog.Close>
  //       {!isEmpty && (
  //         <Dialog.Close asChild>
  //           <Button
  //             variant='primary'
  //             disabled={Object.keys(selected).length < 1}
  //             onClick={() => onDone(nodes.filter(({ id }) => !!selected[id]).map(({ data }) => data))}
  //           >
  //             {t('chooser done label')}
  //           </Button>
  //         </Dialog.Close>
  //       )}
  //     </div>
  //   </>
  // );
  return null;
};
