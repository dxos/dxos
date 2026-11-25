//
// Copyright 2026 DXOS.org
//

import { TrajectoryStore } from '@dxos/assistant';
import * as Agent from '@dxos/compute/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Sequence } from '@dxos/conductor';
import { Feed, type Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';

// The single source for the plugin's schema list, loaded lazily by every `AssistantPlugin`
// variant's schema module: these types ride heavy barrels (@dxos/assistant → @effect/ai →
// fast-check/zod) that must stay out of the definition's static closure.
const types: ReadonlyArray<Type.AnyEntity> = [
  Agent.Session,
  Skill.Skill,
  ...TrajectoryStore.types,
  Feed.Feed,
  HasSubject.HasSubject,
  Instructions.Instructions,
  Agent.Agent,
  Sequence.Sequence,
  Text.Text,
];

export default types;
