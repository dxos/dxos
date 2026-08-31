//
// Copyright 2026 DXOS.org
//

import { type Registry, createRegistry } from '@bufbuild/protobuf';

import { file_dxos_client_invitation } from './proto/gen/dxos/client/invitation_pb.ts';
import { file_dxos_client_logging } from './proto/gen/dxos/client/logging_pb.ts';
import { file_dxos_client_services } from './proto/gen/dxos/client/services_pb.ts';
import { file_dxos_config } from './proto/gen/dxos/config_pb.ts';
import { file_dxos_devtools_host } from './proto/gen/dxos/devtools/host_pb.ts';
import { file_dxos_devtools_swarm } from './proto/gen/dxos/devtools/swarm_pb.ts';
import { file_dxos_echo_feed } from './proto/gen/dxos/echo/feed_pb.ts';
import { file_dxos_echo_indexing } from './proto/gen/dxos/echo/indexing_pb.ts';
import { file_dxos_echo_metadata } from './proto/gen/dxos/echo/metadata_pb.ts';
import { file_dxos_echo_object } from './proto/gen/dxos/echo/object_pb.ts';
import { file_dxos_echo_query } from './proto/gen/dxos/echo/query_pb.ts';
import { file_dxos_echo_snapshot } from './proto/gen/dxos/echo/snapshot_pb.ts';
import { file_dxos_echo_timeframe } from './proto/gen/dxos/echo/timeframe_pb.ts';
import { file_dxos_edge_calls } from './proto/gen/dxos/edge/calls_pb.ts';
import { file_dxos_edge_messenger } from './proto/gen/dxos/edge/messenger_pb.ts';
import { file_dxos_edge_signal } from './proto/gen/dxos/edge/signal_pb.ts';
import { file_dxos_error } from './proto/gen/dxos/error_pb.ts';
import { file_dxos_field_options } from './proto/gen/dxos/field_options_pb.ts';
import { file_dxos_google } from './proto/gen/dxos/google_pb.ts';
import { file_dxos_halo_credentials } from './proto/gen/dxos/halo/credentials_pb.ts';
import { file_dxos_halo_invitations } from './proto/gen/dxos/halo/invitations_pb.ts';
import { file_dxos_halo_keyring } from './proto/gen/dxos/halo/keyring_pb.ts';
import { file_dxos_halo_signed } from './proto/gen/dxos/halo/signed_pb.ts';
import { file_dxos_iframe } from './proto/gen/dxos/iframe_pb.ts';
import { file_dxos_keys } from './proto/gen/dxos/keys_pb.ts';
import { file_dxos_mesh_bridge } from './proto/gen/dxos/mesh/bridge_pb.ts';
import { file_dxos_mesh_messaging } from './proto/gen/dxos/mesh/messaging_pb.ts';
import { file_dxos_mesh_muxer } from './proto/gen/dxos/mesh/muxer_pb.ts';
import { file_dxos_mesh_presence } from './proto/gen/dxos/mesh/presence_pb.ts';
import { file_dxos_mesh_signal } from './proto/gen/dxos/mesh/signal_pb.ts';
import { file_dxos_mesh_swarm } from './proto/gen/dxos/mesh/swarm_pb.ts';
import { file_dxos_mesh_teleport_admission_discovery } from './proto/gen/dxos/mesh/teleport/admission-discovery_pb.ts';
import { file_dxos_mesh_teleport_auth } from './proto/gen/dxos/mesh/teleport/auth_pb.ts';
import { file_dxos_mesh_teleport_automerge } from './proto/gen/dxos/mesh/teleport/automerge_pb.ts';
import { file_dxos_mesh_teleport_control } from './proto/gen/dxos/mesh/teleport/control_pb.ts';
import { file_dxos_mesh_teleport_gossip } from './proto/gen/dxos/mesh/teleport/gossip_pb.ts';
import { file_dxos_mesh_teleport_notarization } from './proto/gen/dxos/mesh/teleport/notarization_pb.ts';
import { file_dxos_mesh_teleport_replicator } from './proto/gen/dxos/mesh/teleport/replicator_pb.ts';
import { file_dxos_rpc } from './proto/gen/dxos/rpc_pb.ts';
import { file_dxos_service_agentmanager } from './proto/gen/dxos/service/agentmanager_pb.ts';
import { file_example_testing_data } from './proto/gen/example/testing/data_pb.ts';
import { file_example_testing_rpc } from './proto/gen/example/testing/rpc_pb.ts';

/**
 * Every generated buf file descriptor, so a message resolves from the type name the legacy codec is
 * keyed by. `service-rpc.test.ts` fails when a new `.proto` file is missing from this list.
 */
export const bufRegistry: Registry = createRegistry(
  file_dxos_client_invitation,
  file_dxos_client_logging,
  file_dxos_client_services,
  file_dxos_config,
  file_dxos_devtools_host,
  file_dxos_devtools_swarm,
  file_dxos_echo_feed,
  file_dxos_echo_indexing,
  file_dxos_echo_metadata,
  file_dxos_echo_object,
  file_dxos_echo_query,
  file_dxos_echo_snapshot,
  file_dxos_echo_timeframe,
  file_dxos_edge_calls,
  file_dxos_edge_messenger,
  file_dxos_edge_signal,
  file_dxos_error,
  file_dxos_field_options,
  file_dxos_google,
  file_dxos_halo_credentials,
  file_dxos_halo_invitations,
  file_dxos_halo_keyring,
  file_dxos_halo_signed,
  file_dxos_iframe,
  file_dxos_keys,
  file_dxos_mesh_bridge,
  file_dxos_mesh_messaging,
  file_dxos_mesh_muxer,
  file_dxos_mesh_presence,
  file_dxos_mesh_signal,
  file_dxos_mesh_swarm,
  file_dxos_mesh_teleport_admission_discovery,
  file_dxos_mesh_teleport_auth,
  file_dxos_mesh_teleport_automerge,
  file_dxos_mesh_teleport_control,
  file_dxos_mesh_teleport_gossip,
  file_dxos_mesh_teleport_notarization,
  file_dxos_mesh_teleport_replicator,
  file_dxos_rpc,
  file_dxos_service_agentmanager,
  file_example_testing_data,
  file_example_testing_rpc,
);
