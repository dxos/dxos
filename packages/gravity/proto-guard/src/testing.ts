//
// Copyright 2023 DXOS.org
//

export const data = {
  epochs: 1,

  space: {
    properties: {
      name: 'test',
    },

    expando: {
      type: 'expando', // TODO(burdon): Is this actual data?
      value: 100,
      string: 'hello world!',
      array: ['one', 'two', 'three'],
    },

    text: {
      content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
        Sed ullamcorper nunc est, ut auctor enim auctor vitae. Proin dapibus mattis velit, 
        sodales tempor leo lobortis eu. Maecenas consequat diam at tempus imperdiet. 
        Curabitur a semper justo. Curabitur egestas vestibulum est. Sed faucibus.`,
    },
  },
};
