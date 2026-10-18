-- API keys for writes through the DEUS Worker (D164). Reads need no key.
create table api_keys (
  id           text primary key,            -- public id, the deus_<id>_ part of a key
  secret_hash  text not null,               -- sha256 of the secret, which is never stored
  label        text not null,
  scopes       text not null,               -- json list: push, compact, assets, inbox, site, events, admin
  projects     text not null default '"*"', -- json: "*" or a list of project names
  created_at   integer not null,            -- ms since the epoch, as are the other times
  expires_at   integer,
  revoked_at   integer,
  last_used_at integer
);

-- One row per authorized write.
create table audit (
  at      integer not null,
  key_id  text not null,
  method  text not null,
  path    text not null,
  status  integer not null
);

create index audit_at on audit (at);
