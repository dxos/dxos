import { ObjectId } from '@dxos/keys';

export type Blueprint = {
  steps: BlueprintStep[];
};

export const Blueprint = Object.freeze({
  make: (steps: string[]) => {
    return {
      steps: steps.map((step, index) => ({
        id: ObjectId.random(),
        instructions: step,
      })),
    };
  },
});

export type BlueprintStep = {
  id: ObjectId;
  instructions: string;
};
