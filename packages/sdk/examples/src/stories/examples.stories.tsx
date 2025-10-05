//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';

import { TaskListExample } from '../examples';
import { NetworkToggle } from '../template/src/components';

const meta = {
  title: 'sdk/examples/DXOS',

  decorators: [withTheme],
} satisfies Meta<typeof ClientRepeater>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TaskList: Story = {
  render: () => <ClientRepeater count={2} component={TaskListExample} controls={NetworkToggle} createSpace />,
};

// TODO(wittjosiah): Migrate main to story.

// const editor = await setupPeersInSpace({
//   count: 2,
//   schema: types,
//   onCreateSpace: ({ space }) => {
//     space.db.add(new Document());
//   },
// });

// // TODO(wittjosiah): Reconcile with ToggleNetworkDecorator.
// const DemoToggles = ({
//   clients,
//   spaceKey,
// }: {
//   clients: Client[];
//   spaceKey: PublicKey;
// }): DecoratorFunction<ReactRenderer, any> => {
//   const handleToggleNetwork = async (checked: boolean) => {
//     const mode = checked ? ConnectionState.OFFLINE : ConnectionState.ONLINE;
//     await Promise.all(clients.map((client) => client.mesh.updateConfig(mode)));
//   };

//   const handleToggleBatching = async (checked: boolean) => {
//     const batchSize = checked ? 64 : 0;
//     clients.forEach((client) => {
//       const space = client.spaces.get(spaceKey);
//       if (space) {
//         space.db._backend.maxBatchSize = batchSize;
//       }
//     });
//   };

//   return (Story, context) => (
//     <>
//       <div className='demo-buttons space-b-2'>
//         <div className='flex'>
//           <Input.Root>
//             <Input.Switch classNames='me-2' onCheckedChange={handleToggleNetwork} />
//             <Input.Label>
//               Disable{' '}
//               <a
//                 href='https://docs.dxos.org/guide/platform/'
//                 target='_blank'
//                 rel='noreferrer'
//                 className='text-primary-600 dark:text-primary-400'
//               >
//                 replication
//               </a>{' '}
//               (go offline)
//             </Input.Label>
//           </Input.Root>
//         </div>
//         <div className='flex'>
//           <Input.Root>
//             <Input.Switch classNames='me-2' onCheckedChange={handleToggleBatching} />
//             <Input.Label>Enable mutation batching</Input.Label>
//           </Input.Root>
//         </div>
//       </div>
//       {Story({ args: context.args })}
//     </>
//   );
// };

// export const Editor: Story = {
//   render: () => (
//     <ClientRepeater
//       clients={editor.clients}
//       className='demo'
//       Component={EditorExample}
//       args={{ spaceKey: editor.spaceKey }}
//     />
//   ),
//   decorators: [DemoToggles(editor)],
// };
