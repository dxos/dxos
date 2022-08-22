import { PublicKey } from "@dxos/protocols";
import { getCredentialAssertion, verifyCredential } from "../credentials";
import { Credential, PartyMember } from "../proto";
import { FeedInfo, FeedStateMachine } from "./feed-state-machine";
import { MemberStateMachine, MemberInfo } from "./member-state-machine";
import debug from "debug";

const log = debug("dxos:halo:party-state-machine");

/**
 * Validates and processes credentials for a single party.
 * Keeps a list of members and feeds.
 * Keeps and in-memory index of credentials and allows to query them.
 */
export class PartyStateMachine {
  private readonly _members = new MemberStateMachine(this._partyKey);
  private readonly _feeds = new FeedStateMachine(this._partyKey);
  private readonly _credentials: Credential[] = [];
  private _genesisCredential: Credential | undefined;

  constructor(
    private readonly _partyKey: PublicKey,
  ) {}

  get genesisCredential(): Credential | undefined {
    return this._genesisCredential;
  }

  get members(): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members.members;
  }

  get feeds(): ReadonlyMap<PublicKey, FeedInfo> {
    return this._feeds.feeds;
  }

  /**
   * @param fromFeed Key of the feed where this credential is recorded.
   */
  async process(credential: Credential, fromFeed: PublicKey): Promise<boolean> {
    const result = await verifyCredential(credential);
    if (result.kind !== "pass") {
      log(`Invalid credential: ${result.errors.join(", ")}`);
      return false;
    }

    switch(getCredentialAssertion(credential)['@type']) {
      case 'dxos.halo.credentials.PartyGenesis':
        if (this._genesisCredential) {
          log("Party already has a genesis credential.");
          return false;
        }
        if(!credential.issuer.equals(this._partyKey)) {
          log("Party genesis credential must be issued by party.");
          return false;
        }
        if(!credential.subject.id.equals(this._partyKey)) {
          log("Party genesis credential must be issued to party.");
          return false;
        }
        this._genesisCredential = credential;
        break;
      case 'dxos.halo.credentials.PartyMember':
        if(!this._genesisCredential) {
          log("Party must have a genesis credential before adding members.");
          return false;
        }
        if(!this._canInviteNewMembers(credential.issuer)) {
          log(`Party member ${credential.issuer} is not authorized to invite new members.`);
          return false;
        }
        this._members.process(credential);
        break;
      case 'dxos.halo.credentials.AdmittedFeed':
        if(!this._genesisCredential) {
          log("Party must have a genesis credential before admitting feeds.");
          return false;
        }
        if(!this._canAdmitFeeds(credential.issuer)) {
          log(`Party member ${credential.issuer} is not authorized to admit feeds.`);
          return false;
        }
        this._feeds.process(credential, fromFeed);
        break;
    }

    this._credentials.push(credential);

    return true;
  }

  private _canInviteNewMembers(key: PublicKey): boolean {
    return key.equals(this._partyKey) || this._members.getRoles(key).includes(PartyMember.Role.ADMIN);
  }

  private _canAdmitFeeds(key: PublicKey): boolean {
    return this._members.getRoles(key).includes(PartyMember.Role.WRITER);
  }
}