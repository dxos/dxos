//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { FactoryAnnotation, type FactoryFn } from '@dxos/schema';

/** Foreign-key source for Chess.com account and game objects. */
export const CHESS_COM_SOURCE = 'chess.com';

export const getForeignKey = (obj: Obj.Unknown): string | undefined => Obj.getKeys(obj, CHESS_COM_SOURCE).at(0)?.id;


/** Normalises a Chess.com username for API calls and foreign keys. */
export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

/**
 * Linked Chess.com player account. Synced games live in the backing {@link games} feed
 * as {@link org.dxos.type.game} objects with chess variant state.
 */
export class Account extends Type.makeObject<Account>(DXN.make('org.dxos.type.chessCom.account', '0.1.0'))(
  Schema.Struct({
    username: Schema.String.annotations({
      title: 'Username',
      description: 'Chess.com username.',
    }),
    playerId: Schema.Number.pipe(FormInputAnnotation.set(false), Schema.optional),
    profileUrl: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
    followers: Schema.Number.pipe(FormInputAnnotation.set(false), Schema.optional),
    country: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
    lastOnline: Schema.Number.pipe(FormInputAnnotation.set(false), Schema.optional),
    joined: Schema.Number.pipe(FormInputAnnotation.set(false), Schema.optional),
    status: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
    isStreamer: Schema.Boolean.pipe(FormInputAnnotation.set(false), Schema.optional),
    verified: Schema.Boolean.pipe(FormInputAnnotation.set(false), Schema.optional),
    league: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
    streamingPlatforms: Schema.mutable(Schema.Array(Schema.String))
      .pipe(FormInputAnnotation.set(false), Schema.optional),
    /** Backing queue of synced {@link org.dxos.type.game} objects. */
    games: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['username']),
    Annotation.IconAnnotation.set({ icon: 'ph--horse--regular', hue: 'green' }),
    FactoryAnnotation.set(((values) => makeAccount(values)) as FactoryFn),
  ),
) {}

export type AccountProfile = Pick<
  Obj.MakeProps<typeof Account>,
  | 'playerId'
  | 'profileUrl'
  | 'followers'
  | 'country'
  | 'lastOnline'
  | 'joined'
  | 'status'
  | 'isStreamer'
  | 'verified'
  | 'league'
  | 'streamingPlatforms'
>;

/** Creates a ChessComAccount with a child games feed and account foreign key. */
export const makeAccount = (
  props: Omit<Obj.MakeProps<typeof Account>, 'games'> & { username: string },
): Account => {
  const gamesFeed = Feed.make();
  const username = normalizeUsername(props.username);
  const account = Obj.make(Account, {
    ...props,
    username,
    games: Ref.make(gamesFeed),
    [Obj.Meta]: { keys: [{ source: CHESS_COM_SOURCE, id: username }] },
  });
  Obj.setParent(gamesFeed, account);
  return account;
};

/** Applies player profile fields from the chess.com API onto an account. */
export const applyProfile = (account: Account, profile: AccountProfile): void => {
  Obj.update(account, (account) => {
    Object.assign(account, profile);
  });
};

export const CreateAccountSchema = Schema.Struct({
  username: Schema.String.annotations({
    title: 'Username',
    description: 'Your Chess.com username.',
  }),
});

export type CreateAccountInput = Schema.Schema.Type<typeof CreateAccountSchema>;
