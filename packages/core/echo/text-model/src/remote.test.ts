//
// Copyright 2021 DXOS.org
//

// describe('With remote database', () => {
//   test('create and write text', async () => {
//     const modelFactory = new ModelFactory().registerModel(TextModel);
//     const backend = await createMemoryDatabase(modelFactory);
//     const frontend = await createRemoteDatabaseFromDataServiceHost(modelFactory, backend.createDataServiceHost());

//     const text = await frontend.createItem({
//       model: TextModel,
//       type: 'example:type/text'
//     });
//     await text.model.insert('Hello world', 0);

//     expect(text.model.textContent).toEqual('Hello world');
//   });

//   test('create with parent', async () => {
//     const modelFactory = new ModelFactory().registerModel(TextModel).registerModel(DocumentModel);
//     const backend = await createMemoryDatabase(modelFactory);
//     const frontend = await createRemoteDatabaseFromDataServiceHost(modelFactory, backend.createDataServiceHost());

//     const parent = await frontend.createItem({
//       model: DocumentModel
//     });

//     const text = await frontend.createItem({
//       model: TextModel,
//       type: 'example:type/text',
//       parent: parent.id
//     });
//     await text.model.insert('Hello world', 0);

//     expect(text.model.textContent).toEqual('Hello world');
//   });
// });

export {};
