import { SpaceId } from '@dxos/keys';
import { Schema } from 'effect';

export const SpaceIdSchema: Schema.Schema<SpaceId, string> = Schema.String.pipe(Schema.filter(SpaceId.isValid));
