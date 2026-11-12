//
// Copyright 2026 DXOS.org
//

import { tutorialProject } from '../../../echo/tutorial-project.ts';

/** The tutorial project's setup files, which the coding-agent prompt has an agent start from. */
const FILES = ['index.html', 'package.json', 'tsconfig.json', 'vite.config.ts'];

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  json: 'application/json; charset=utf-8',
  ts: 'text/plain; charset=utf-8',
};

export const getStaticPaths = () => FILES.map((file) => ({ params: { file } }));

export const GET = ({ params }: { params: { file: string } }) => {
  let body = tutorialProject('complete')[params.file];
  if (params.file === 'package.json') {
    const { stackblitz: _, ...pkg } = JSON.parse(body);
    body = `${JSON.stringify({ ...pkg, name: 'echo-app' }, null, 2)}\n`;
  } else if (params.file === 'index.html') {
    body = body.replace('<title>Contacts</title>', '<title>ECHO app</title>');
  }
  return new Response(body, { headers: { 'Content-Type': TYPES[params.file.split('.').pop()!] } });
};
