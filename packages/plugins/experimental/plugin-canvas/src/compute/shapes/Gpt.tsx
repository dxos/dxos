//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { getHeight } from './Function';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { GptInput } from '../graph';

export const GptShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('gpt'),
  }),
);

export type GptShape = S.Schema.Type<typeof GptShape>;

export type CreateGptProps = CreateShapeProps<GptShape>;

export const createGpt = ({ id, ...rest }: CreateGptProps): GptShape => {
  return {
    id,
    type: 'gpt',
    size: { width: 256, height: getHeight(GptInput) },
    ...rest,
  };
};

export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {
  return null;
  // return (
  //   <FunctionBody name={shape.node.name} inputSchema={shape.node.inputSchema} outputSchema={shape.node.outputSchema} />
  // );
};

export const gptShape: ShapeDef<GptShape> = {
  type: 'gpt',
  icon: 'ph--brain--regular',
  component: GptComponent,
  createShape: createGpt,
  // getAnchors: (shape) => createFunctionAnchors(shape, shape.node.inputSchema, shape.node.outputSchema),
};
