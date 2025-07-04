//
// Copyright 2023 DXOS.org
//

// import '@dxos-theme';

//
// import React from 'react';
//
// import { faker } from '@dxos/random';
// import { Input, ScrollArea } from '@dxos/react-ui';
// import { modalSurface, mx } from '@dxos/react-ui-theme';
// import { withTheme } from '@dxos/storybook-utils';
//
// import { Card } from './Card';
//
// faker.seed(1);
//
// // https://unsplash.com
// // TODO(burdon): Use https://picsum.photos
// const testImages = [
//   'https://images.unsplash.com/photo-1616394158624-a2ba9cfe2994',
//   'https://images.unsplash.com/photo-1507941097613-9f2157b69235',
//   'https://images.unsplash.com/photo-1431274172761-fca41d930114',
//   'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad',
//   'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729',
//   'https://images.unsplash.com/photo-1605425183435-25b7e99104a4',
// ];
//
// const ReadonlyCardStory = () => {
//   return (
//     <div className='flex flex-col overflow-y-scroll'>
//       <div className='flex flex-col gap-4'>
//         <Card.Root item={{ id: 'readonly card story 1' }} data-flags='square noPadding'>
//           <Card.Heading data-flags='floating'>
//             <Card.DragHandle data-flags='positionLeft' />
//             <Card.Menu data-flags='positionRight' />
//           </Card.Heading>
//           <Card.Media src={testImages[1]} />
//         </Card.Root>
//
//         <Card.Root item={{ id: 'readonly card story 2' }}>
//           <Card.Heading>
//             <Card.HeadingLabel title={faker.lorem.sentence(3)} />
//           </Card.Heading>
//         </Card.Root>
//
//         <Card.Root item={{ id: 'readonly card story 3' }}>
//           <Card.Content classNames={'text-sm font-thin h-[100px]'}>
//             <ScrollArea.Root>
//               <ScrollArea.Viewport>{faker.lorem.sentences(16)}</ScrollArea.Viewport>
//               <ScrollArea.Scrollbar orientation='vertical'>
//                 <ScrollArea.Thumb />
//               </ScrollArea.Scrollbar>
//             </ScrollArea.Root>
//           </Card.Content>
//         </Card.Root>
//
//         <Card.Root item={{ id: 'readonly card story 4' }}>
//           <Card.Heading>
//             <Card.HeadingLabel data-flags='center' title={faker.lorem.sentence(3)} />
//           </Card.Heading>
//           <Card.Content classNames={'text-sm font-thin'}>{faker.lorem.sentences(3)}</Card.Content>
//         </Card.Root>
//
//         <Card.Root item={{ id: 'readonly card story 5' }}>
//           <Card.Heading>
//             <Card.DragHandle />
//             <Card.HeadingLabel title={faker.lorem.sentence(8)} />
//             {/* TODO(burdon): Menu util. */}
//             <Card.Menu />
//           </Card.Heading>
//           <Card.Content data-flags='gutter' classNames={'gap-2 text-sm font-thin'}>
//             <p>Content with gutter</p>
//             <p className='line-clamp-3'>{faker.lorem.sentences(3)}</p>
//           </Card.Content>
//         </Card.Root>
//
//         <Card.Root item={{ id: 'readonly card story 6' }}>
//           <Card.Heading>
//             <Card.DragHandle />
//             <Card.HeadingLabel title={faker.lorem.sentence(3)} />
//             <Card.Menu />
//           </Card.Heading>
//           <Card.Content data-flags='gutter' classNames={'text-sm gap-2 font-thin'}>
//             <p className='line-clamp-3'>{faker.lorem.sentences(1)}</p>
//           </Card.Content>
//           <Card.Media className={'h-[200px] grayscale'} src={testImages[0]} />
//           <Card.Content data-flags='gutter' classNames={'text-sm gap-2 font-thin'}>
//             <p className='line-clamp-3'>{faker.lorem.sentences(3)}</p>
//           </Card.Content>
//         </Card.Root>
//       </div>
//     </div>
//   );
// };
//
// const EditableCardStory = () => {
//   return (
//     <div className='flex flex-col h-full justify-center'>
//       <Card.Root item={{ id: 'editable card story 1' }}>
//         <Card.Heading>
//           <Card.DragHandle />
//           <Input.Root>
//             <Input.TextInput classNames={'-mx-2 px-2'} variant='subdued' placeholder={'Title'} />
//           </Input.Root>
//           <Card.Menu />
//         </Card.Heading>
//         <Card.Content data-flags='gutter' classNames={'gap-2 text-sm font-thin'}>
//           {faker.lorem.sentences()}
//         </Card.Content>
//       </Card.Root>
//     </div>
//   );
// };
//
// export default {
//   title: 'ui/react-ui-card/Card',
//   component: Card,
//   decorators: [
//     withTheme,
//     (Story: any) => (
//       <div className={mx('flex h-screen w-full justify-center overflow-hidden', modalSurface)}>
//         <div className='flex flex-col w-[360px] overflow-hidden'>
//           <Story />
//         </div>
//       </div>
//     ),
//   ],
//   parameters: {
//     layout: 'fullscreen',
//   },
// };
//
// export const ReadOnly = () => <ReadonlyCardStory />;
// export const Editable = () => <EditableCardStory />;
