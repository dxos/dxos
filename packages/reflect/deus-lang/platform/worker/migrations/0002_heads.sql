-- The head of each branch as the Worker last accepted it (D167): a push names the head it built
-- on, and is refused unless that is still the head, so concurrent pushes cannot fork a branch.
create table heads (
  project text not null,
  branch text not null,
  causal text not null,
  updated_at integer not null,
  key_id text,
  primary key (project, branch)
);
