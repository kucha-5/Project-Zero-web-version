Project Zero 49.31.0 - Crystal Factory Hands-on Redesign

Game/
  Browser game build 2026083001-coop-hub-ui-room-level.

Co-op repair
  - Keeps Guest and SF Account identity behavior from 49.25.1.
  - Fixes local prediction, server reconciliation, remote interpolation,
    authoritative damage, dash evasion, shared monsters, resources and devices.
  - Removes the legacy room poll/shared-state runtime path that competed with
    the v3 WebSocket room.

Cloudflare/
  sf-account-worker-v3.2.5.js contains the existing SF Account APIs plus the
  new Crystal War WebSocket gateway and PZCrystalWarRoom Durable Object.

Multiplayer architecture
  - One room is one isolated authoritative world instance.
  - Maximum room population is 3 players.
  - The Room runs at a fixed 20 Tick/s; rendering remains 60/120/Unlimited FPS.
  - Clients send Input and one-shot Events, not high-frequency full sharedState.
  - The Room sends Snapshots with input acknowledgements and authoritative
    player, monster, HP, resource and dynamic-world state.
  - Local movement uses prediction and smooth reconciliation.
  - Remote players and monsters render from an adaptive 80-170ms server-time
    interpolation buffer with stale-snapshot rejection and bounded extrapolation.
  - Monster AI, damage, death, respawn, drops and automated collection run once
    in the Room instance instead of once on every client.
  - Attack, skill, ultimate, dash, switch, parry, Emoji and device operations
    use deduplicated eventId/sequence messages.
  - Full state is reserved for join, reconnect and low-frequency persistence.

Required Cloudflare deployment
  Version 49.29.5 keeps all three clients on one room-seeded lobby/hub map, fixes
  merchant ESC routing, removes the duplicate post-start ready control, uses one
  stable daily Emoji input path, upgrades loading and merchant presentation, and
  adds an 80-level co-op reward page whose rewards are divided among 3 players.
  It preserves server-time ball interpolation. Deploy Worker 3.2.5 with it;
  updating only one side will leave the old synchronization behavior active.
  The service must
  retain its existing D1 binding named DB and add a Durable Object binding:

    Binding name: CRYSTAL_WAR_ROOMS
    Class name:   PZCrystalWarRoom

  Apply the new_sqlite_classes migration once. A Wrangler example and detailed
  dashboard instructions are included in Cloudflare/.

Deployment order
  1. Back up the deployed Worker and D1 database.
  2. Add the Durable Object binding/migration, then deploy
     Cloudflare/sf-account-worker-v3.2.5.js.
  3. Confirm /api/status reports version 3.2.5.
  4. Upload the contents of Game/ to the current game host.
  5. Hard-refresh all test clients once so build 2026083001 loads.
  6. Verify 1-player, 2-player and 3-player rooms before public release.

Validation
  Run: node tests/authoritative-room.test.mjs
  The test covers 3-player state, fixed tick declarations, input/action/event
  deduplication, snapshots, repeated Emoji, shared device/resource mutation and
  stale-socket reconnect protection.

49.28.1 incoming-damage correction
  - The Room receives the active role's level, panel HP, DEF and module damage
    reduction instead of treating every role as the same 100-HP prototype.
  - Enemy hits remain authoritative normalized HP damage, but are reduced by
    cultivation/defense and by bounded same-window crowd-pressure falloff.
  - Enemy first attacks are staggered after spawn and route restore so a group
    cannot stack every hit into the same server tick.
  - Single-player monster damage and AI values are unchanged.
Project Zero 49.30.6 - Original Enemy HP Style Restored
Project Zero 49.30.6 - Friend Support & Damage Balance
Project Zero 49.30.6 - Global Support & Friends Routing Fix
