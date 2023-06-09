//
// Copyright 2023 DXOS.org
//

// prettier-ignore
const slides = [
  [
    '---',
    'layout: fullscreen',
    'image: https://dev.kube.dxos.org/ipfs/gateway/QmbsKuxFkcn7YHtUd882dcZ4SapLeqEKnzXHs2t6iPBaon',
    '---'
  ],
  [
    '---',
    'layout: columns',
    'image: https://dev.kube.dxos.org/ipfs/gateway/QmRCqEGBRojS8AtQfFm3P6CMfdTWtqjM4e7JcCGfGY7eZR',
    '---',
    '# ECHO',
    '- Peer-to-peer graph database', // Principled and functional.
    '- Structured and unstructured data', // Records/text/files, query/subscriptions/search.
    '- Real-time synchronization', // Consistency, access control.
    '- Access control',
    '- Works offline', // Occasionally connected. Consistency.
    '- Simple API' // KEY: Similar to Web2; transparent; like industry standards like Apollo GraphQL; toolchain
  ],
  [
    '---',
    'layout: rows',
    'image: https://dev.kube.dxos.org/ipfs/gateway/QmbPDPZXfKsP9rVyNJjtNu3o4c62tCFZjFLvPwpG4zEGeZ',
    '---',
    '# Distributed data'
  ],
  [
    '---',
    'layout: rows',
    'image: https://dev.kube.dxos.org/ipfs/gateway/Qmc9xBnx5dTkbvYgawUuEqVYBrvH9d69snmMHecEuWB6K2',
    '---',
    '# Distributed data'
  ],
  [
    '---',
    'layout: rows',
    'image: https://dev.kube.dxos.org/ipfs/gateway/QmQ3qSGeEw273dSPz73LGKhDu9H66soid1weu1T6u5ci5c',
    '---',
    '# Data consistency'
  ],
  [
    '---',
    'layout: rows',
    'image: https://dev.kube.dxos.org/ipfs/gateway/QmZDAhgiNmaYbnvac5mxDPTHTFdMuUVcceptEttH2Lj5Jw',
    '---',
    '# Data consistency'
  ],
  [
    '---',
    'layout: rows',
    'image: https://dev.kube.dxos.org/ipfs/gateway/QmVP1hvbgxY8g5bdFXKj6ehULbXwLfpC7AApKJMCnXSZub',
    '---',
    '# Data federation'
  ],
  [
    '# React components',
    '```tsx',
    'import React from \'react\'',
    'import { useClient } from \'@dxos/react-client\'',
    '',
    'import { Task } from \'./schema\'',
    '',
    'const TaskList = ({ key }) => {',
    '  const space = useSpace(key)',
    '  const { objects: tasks } = space.db.query(Task)',
    '',
    '  const handleCreate = (title: string) => {',
    '    space.db.add(new Task({ title }))',
    '  }',
    '',
    '  return <ul>{tasks.map(task => <li key={task.id}>{task.title}</li>)}</ul>',
    '}',
    '```'
  ],
  [
    '# Remote Functions',
    '```ts',
    'import Chess from \'chess.js\'',
    '',
    'const f = (client, space) => {',
    '  const key = client.halo.identity.key',
    '  const query = space.db.query(Game)',
    '  query.subscribe(({ objects }) => {',
    '    objects.forEach((game) => {',
    '      const play = game.white === key ? \'w\' : game.black === key ? \'b\' : undefined',
    '      const chess = new Chess(game.moves)',
    '      if (chess.turn() === play) {',
    '        const moves = chess.moves()',
    '        game.moves.push(moves[Math.floor(Math.random() * moves.length)])',
    '      }',
    '    })',
    '  })',
    '}',
    '```'
  ]
].map((lines) => lines.join('\n'));

export default slides;
