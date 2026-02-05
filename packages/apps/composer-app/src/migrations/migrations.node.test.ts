//
// Copyright 2024 DXOS.org
//

// import { afterEach, beforeEach, describe } from 'vitest';

// import { Client } from '@dxos/client';
// import { type Space } from '@dxos/client/echo';
// import { TestBuilder } from '@dxos/client/testing';
// import { Markdown } from '@dxos/plugin-markdown/types';
// import { DiagramType } from '@dxos/plugin-sketch/types';
// import { CollectionType, ChannelType, ThreadType } from '@dxos/plugin-space/types';
// import { TableType } from '@dxos/react-ui-table/types';
//
// const testBuilder = new TestBuilder();

// describe('Composer migrations', () => {
//   let client: Client;
//   let space: Space;

//   beforeEach(async () => {
//     client = new Client({
//       services: testBuilder.createLocalClientServices(),
//       types: [ChannelType, CollectionType, Markdown.Document, Message.Message, DiagramType, TableType, ThreadType],
//     });

//     await client.initialize();
//     await client.halo.createIdentity();
//     await client.spaces.waitUntilReady();
//     space = client.spaces.default;
//   });

//   afterEach(async () => {
//     await client.destroy();
//   });
// });
