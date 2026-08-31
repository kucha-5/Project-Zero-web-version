const VERSION = "3.2.7";
const CRYSTAL_WAR_MAX_PLAYERS = 3;
const CRYSTAL_WAR_TICKET_SECONDS = 45;
const PBKDF2_ITERATIONS = 100000;
const FRIEND_LIMIT = 15;
const FRIEND_OUTGOING_LIMIT = 30;

const ACCESS_TOKEN_SECONDS = 60 * 60;
const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
const CODE_EXPIRE_SECONDS = 5 * 60;
const CODE_RESEND_SECONDS = 60;
const VERIFY_TICKET_SECONDS = 10 * 60;
const MAX_CODE_ATTEMPTS = 5;
const ACCOUNT_DELETION_SECONDS = 7 * 24 * 60 * 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

let databaseReadyPromise = null;

function ensureDatabaseReady(env) {
  if (!databaseReadyPromise) {
    databaseReadyPromise = ensureDatabase(env.DB).catch(error => {
      databaseReadyPromise = null;
      throw error;
    });
  }
  return databaseReadyPromise;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    try {
      validateBindings(env);
      await ensureDatabaseReady(env);

      const url = new URL(request.url);
      const path = normalizePath(url.pathname);

      if (request.method === "GET" &&
          (path === "/" || path === "/api/status" || path === "/api/health")) {
        return jsonResponse({
          success: true,
          service: "SF Account",
          status: "online",
          version: VERSION,
          emailVerification: true,
          mailServiceConfigured: Boolean(
            env.APPS_SCRIPT_URL && env.SF_MAIL_SECRET
          ),
          timestamp: new Date().toISOString()
        });
      }

      if (path === "/api/auth/request-code" && request.method === "POST") {
        return await requestVerificationCode(request, env);
      }

      if (path === "/api/auth/verify-code" && request.method === "POST") {
        return await verifyEmailCode(request, env);
      }

      if (
        path === "/api/auth/complete-registration" &&
        request.method === "POST"
      ) {
        return await completeRegistration(request, env);
      }

      if (path === "/api/auth/register" && request.method === "POST") {
        return errorResponse(
          400,
          "EMAIL_VERIFICATION_REQUIRED",
          "请先发送并验证邮箱验证码"
        );
      }

      if (path === "/api/auth/login" && request.method === "POST") {
        return await login(request, env);
      }

      if (path === "/api/auth/guest" && request.method === "POST") {
        return await createGuestSession(request, env);
      }

      if (path === "/api/auth/bind-guest" && request.method === "POST") {
        return await bindGuestAccount(request, env);
      }

      if (path === "/api/account/guest" && request.method === "DELETE") {
        return await deleteGuestAccount(request, env);
      }

      if (path === "/api/auth/session" && request.method === "GET") {
        return await getSession(request, env);
      }

      if (path === "/api/auth/refresh" && request.method === "POST") {
        return await refreshSession(request, env);
      }

      if (path === "/api/auth/logout" && request.method === "POST") {
        return await logout(request, env);
      }

      if (
        path === "/api/account/request-deletion" &&
        request.method === "POST"
      ) {
        return await requestAccountDeletion(request, env);
      }

      if (
        path === "/api/account/cancel-deletion" &&
        request.method === "POST"
      ) {
        return await cancelAccountDeletion(request, env);
      }

      if (
        path === "/api/account/meta" &&
        request.method === "GET"
      ) {
        return await getAccountMeta(request, env);
      }

      if (path === "/api/friends" && request.method === "GET") {
        return await getFriendCenter(request, env);
      }

      if (path === "/api/profile/public" && request.method === "PUT") {
        return await updatePublicProfile(request, env);
      }

      if (path === "/api/friends/search" && request.method === "GET") {
        return await searchFriendProfiles(request, env, url);
      }

      if (path === "/api/support/operators" && request.method === "GET") {
        return await getGlobalSupportOperators(request, env, url);
      }

      if (path === "/api/friends/request" && request.method === "POST") {
        return await createFriendRequest(request, env);
      }

      if (path === "/api/friends/respond" && request.method === "POST") {
        return await respondToFriendRequest(request, env);
      }

      if (path === "/api/blocks" && request.method === "GET") {
        return await getBlockList(request, env);
      }

      if (path === "/api/blocks" && request.method === "POST") {
        return await blockPlayer(request, env);
      }

      if (path.startsWith("/api/blocks/") && request.method === "DELETE") {
        return await unblockPlayer(request, env, path);
      }

      if (
        path.startsWith("/api/friends/") &&
        request.method === "DELETE"
      ) {
        return await deleteFriend(request, env, path);
      }

      if (path === "/api/crystal-war/rooms/current" && request.method === "GET") {
        return await getCrystalWarRoom(request, env);
      }

      if (path === "/api/crystal-war/rooms" && request.method === "POST") {
        return await createCrystalWarRoom(request, env);
      }

      if (path === "/api/crystal-war/rooms/join" && request.method === "POST") {
        return await joinCrystalWarRoom(request, env);
      }

      if (path === "/api/crystal-war/rooms/ready" && request.method === "POST") {
        return await readyCrystalWarRoom(request, env);
      }

      if (path === "/api/crystal-war/rooms/progress" && request.method === "POST") {
        return await updateCrystalWarRoomProgress(request, env);
      }

      if (path === "/api/crystal-war/rooms/claim" && request.method === "POST") {
        return await claimCrystalWarRoomReward(request, env);
      }

      if (path === "/api/crystal-war/rooms/leave" && request.method === "POST") {
        return await leaveCrystalWarRoom(request, env);
      }

      if (path === "/api/crystal-war/v2/worlds" && request.method === "GET") {
        return await listCrystalWarWorldsV2(request, env);
      }

      if (path === "/api/crystal-war/v2/worlds" && request.method === "POST") {
        return await createCrystalWarWorldV2(request, env);
      }

      if (path.startsWith("/api/crystal-war/v2/worlds/") && request.method === "DELETE") {
        return await deleteCrystalWarWorldV2(request, env, path);
      }

      if (path === "/api/crystal-war/v2/rooms" && request.method === "GET") {
        return await listCrystalWarRoomsV2(request, env);
      }

      if (path === "/api/crystal-war/v2/rooms" && request.method === "POST") {
        return await createCrystalWarRoomV2(request, env);
      }

      if (path === "/api/crystal-war/v2/rooms/current" && request.method === "GET") {
        return await getCrystalWarRoomV2(request, env);
      }

      if (path === "/api/crystal-war/v2/rooms/join" && request.method === "POST") {
        return await joinCrystalWarRoomV2(request, env);
      }

      if (path === "/api/crystal-war/v2/rooms/ready" && request.method === "POST") {
        return await readyCrystalWarRoomV2(request, env);
      }

      if (path === "/api/crystal-war/v2/rooms/state" && request.method === "POST") {
        return await updateCrystalWarPresenceV2(request, env);
      }

      if (path === "/api/crystal-war/v2/rooms/save" && request.method === "PUT") {
        return await saveCrystalWarWorldV2(request, env);
      }

      if (path === "/api/crystal-war/v2/rooms/leave" && request.method === "POST") {
        return await leaveCrystalWarRoomV2(request, env);
      }

      if (path === "/api/crystal-war/v3/realtime-ticket" && request.method === "POST") {
        return await createCrystalWarRealtimeTicketV3(request, env);
      }

      if (path === "/api/crystal-war/v3/realtime" && request.method === "GET") {
        return await connectCrystalWarRealtimeV3(request, env, url);
      }

      if (
        path === "/api/saves" &&
        ["GET", "POST", "PUT"].includes(request.method)
      ) {
        return await handleSaves(request, env, url);
      }

      return errorResponse(404, "NOT_FOUND", "接口不存在");
    } catch (error) {
      console.error("Worker error:", error);

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        safeErrorMessage(error)
      );
    }
  }
};

function validateBindings(env) {
  if (!env.DB) {
    throw new Error("缺少 D1 数据库绑定：DB");
  }

  if (!env.APPS_SCRIPT_URL) {
    throw new Error("缺少环境变量：APPS_SCRIPT_URL");
  }

  if (!env.SF_MAIL_SECRET) {
    throw new Error("缺少加密变量：SF_MAIL_SECRET");
  }
}

async function ensureDatabase(db) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS sf_users_v2 (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS sf_sessions_v2 (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_type TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES sf_users_v2(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS sf_saves_v2 (
      user_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      save_data TEXT NOT NULL,
      save_schema_version INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, game_id),
      FOREIGN KEY (user_id) REFERENCES sf_users_v2(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS sf_email_codes_v2 (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      sent_at INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS sf_verification_tickets_v2 (
      ticket_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS pz_friend_requests_v1 (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (sender_id) REFERENCES sf_users_v2(id)
        ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES sf_users_v2(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS pz_friendships_v1 (
      user_low TEXT NOT NULL,
      user_high TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_low, user_high),
      FOREIGN KEY (user_low) REFERENCES sf_users_v2(id)
        ON DELETE CASCADE,
      FOREIGN KEY (user_high) REFERENCES sf_users_v2(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS pz_public_profiles_v1 (
      user_id TEXT PRIMARY KEY,
      player_uid TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      avatar_role INTEGER NOT NULL DEFAULT 4,
      avatar_frame TEXT NOT NULL DEFAULT 'zero',
      showcase_roles TEXT NOT NULL DEFAULT '[4,0,1]',
      showcase_levels TEXT NOT NULL DEFAULT '[1,1,1]',
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES sf_users_v2(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS pz_blocks_v1 (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (blocker_id, blocked_id),
      FOREIGN KEY (blocker_id) REFERENCES sf_users_v2(id)
        ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES sf_users_v2(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS pz_cw_rooms_v1 (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      host_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      target_kills INTEGER NOT NULL DEFAULT 120,
      shared_kills INTEGER NOT NULL DEFAULT 0,
      shared_sectors INTEGER NOT NULL DEFAULT 0,
      reward_claimed_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (host_id) REFERENCES sf_users_v2(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS pz_cw_room_members_v1 (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      ready INTEGER NOT NULL DEFAULT 0,
      contributed_kills INTEGER NOT NULL DEFAULT 0,
      contributed_sectors INTEGER NOT NULL DEFAULT 0,
      contributed_resources INTEGER NOT NULL DEFAULT 0,
      heartbeat_at INTEGER NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES pz_cw_rooms_v1(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES sf_users_v2(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS pz_cw_worlds_v2 (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      slot_index INTEGER NOT NULL,
      world_name TEXT NOT NULL,
      save_data TEXT NOT NULL DEFAULT '{}',
      revision INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE (owner_id, slot_index),
      FOREIGN KEY (owner_id) REFERENCES sf_users_v2(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS pz_cw_rooms_v2 (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      room_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      host_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      activity TEXT NOT NULL DEFAULT 'lobby',
      max_players INTEGER NOT NULL DEFAULT 3,
      last_event_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (world_id) REFERENCES pz_cw_worlds_v2(id) ON DELETE CASCADE,
      FOREIGN KEY (host_id) REFERENCES sf_users_v2(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS pz_cw_room_members_v2 (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      ready INTEGER NOT NULL DEFAULT 0,
      activity TEXT NOT NULL DEFAULT 'lobby',
      role_id INTEGER NOT NULL DEFAULT 0,
      pos_x REAL NOT NULL DEFAULT 560,
      pos_y REAL NOT NULL DEFAULT 400,
      hp REAL NOT NULL DEFAULT 100,
      area INTEGER NOT NULL DEFAULT 1,
      emote_id INTEGER NOT NULL DEFAULT -1,
      emote_at INTEGER NOT NULL DEFAULT 0,
      heartbeat_ms INTEGER NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES pz_cw_rooms_v2(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES sf_users_v2(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS pz_cw_realtime_tickets_v3 (
      ticket_hash TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,

    `CREATE INDEX IF NOT EXISTS idx_sf_sessions_user
      ON sf_sessions_v2(user_id)`,

    `CREATE INDEX IF NOT EXISTS idx_pz_cw_realtime_ticket_expiry
      ON pz_cw_realtime_tickets_v3(expires_at)`,

    `CREATE INDEX IF NOT EXISTS idx_sf_sessions_expiry
      ON sf_sessions_v2(expires_at)`,

    `CREATE INDEX IF NOT EXISTS idx_sf_tickets_expiry
      ON sf_verification_tickets_v2(expires_at)`,

    `CREATE INDEX IF NOT EXISTS idx_sf_email_codes_expiry
      ON sf_email_codes_v2(expires_at)`,

    `CREATE INDEX IF NOT EXISTS idx_pz_friend_request_receiver
      ON pz_friend_requests_v1(receiver_id, status, created_at)`,

    `CREATE INDEX IF NOT EXISTS idx_pz_friend_request_sender
      ON pz_friend_requests_v1(sender_id, status, created_at)`,

    `CREATE UNIQUE INDEX IF NOT EXISTS idx_pz_friend_request_pending_pair
      ON pz_friend_requests_v1(sender_id, receiver_id)
      WHERE status = 'pending'`,

    `CREATE INDEX IF NOT EXISTS idx_pz_blocks_blocked
      ON pz_blocks_v1(blocked_id, blocker_id)`,

    `CREATE INDEX IF NOT EXISTS idx_pz_cw_members_user
      ON pz_cw_room_members_v1(user_id, heartbeat_at)`,

    `CREATE INDEX IF NOT EXISTS idx_pz_cw_rooms_expiry
      ON pz_cw_rooms_v1(expires_at, status)`,

    `CREATE INDEX IF NOT EXISTS idx_pz_cw_worlds_owner
      ON pz_cw_worlds_v2(owner_id, slot_index)`,

    `CREATE INDEX IF NOT EXISTS idx_pz_cw_rooms_v2_browser
      ON pz_cw_rooms_v2(status, updated_at, expires_at)`,

    `CREATE INDEX IF NOT EXISTS idx_pz_cw_members_v2_user
      ON pz_cw_room_members_v2(user_id, heartbeat_ms)`
  ];

  for (const sql of statements) {
    await db.prepare(sql).run();
  }

  await ensureAccountDeletionColumns(db);
  await ensureAccountTypeColumn(db);
  await ensurePublicProfileShowcaseColumn(db);
  await ensureCrystalWarRealtimeColumnsV3(db);
  await permanentlyDeleteExpiredAccounts(db);

  const now = unixTime();

  await db.prepare(
    `DELETE FROM sf_sessions_v2 WHERE expires_at <= ?`
  ).bind(now).run();

  await db.prepare(
    `DELETE FROM sf_email_codes_v2 WHERE expires_at <= ?`
  ).bind(now).run();

  await db.prepare(
    `DELETE FROM sf_verification_tickets_v2 WHERE expires_at <= ?`
  ).bind(now).run();

  await db.prepare(
    `DELETE FROM pz_cw_rooms_v1 WHERE expires_at <= ?`
  ).bind(now).run();

  await db.prepare(
    `DELETE FROM pz_cw_rooms_v2 WHERE expires_at <= ?`
  ).bind(now).run();

  await db.prepare(
    `DELETE FROM pz_cw_realtime_tickets_v3 WHERE expires_at <= ?`
  ).bind(now).run();
}

async function ensureCrystalWarRealtimeColumnsV3(db) {
  const roomInfo = await db.prepare(`PRAGMA table_info(pz_cw_rooms_v2)`).all();
  const roomColumns = new Set((roomInfo.results || []).map(row => String(row.name)));
  const memberInfo = await db.prepare(`PRAGMA table_info(pz_cw_room_members_v2)`).all();
  const memberColumns = new Set((memberInfo.results || []).map(row => String(row.name)));
  const roomAdds = [
    ["is_private", `ALTER TABLE pz_cw_rooms_v2 ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0`],
    ["state_json", `ALTER TABLE pz_cw_rooms_v2 ADD COLUMN state_json TEXT NOT NULL DEFAULT '{}'`],
    ["state_revision", `ALTER TABLE pz_cw_rooms_v2 ADD COLUMN state_revision INTEGER NOT NULL DEFAULT 0`],
    ["world_seed", `ALTER TABLE pz_cw_rooms_v2 ADD COLUMN world_seed INTEGER NOT NULL DEFAULT 0`]
  ];
  for (const [name, sql] of roomAdds) if (!roomColumns.has(name)) await db.prepare(sql).run();
  if (!memberColumns.has("role_level")) {
    await db.prepare(`ALTER TABLE pz_cw_room_members_v2 ADD COLUMN role_level INTEGER NOT NULL DEFAULT 1`).run();
  }
  await db.prepare(`UPDATE pz_cw_rooms_v2 SET max_players = 3 WHERE max_players > 3`).run();
}

async function ensureAccountTypeColumn(db) {
  const result = await db.prepare(
    `PRAGMA table_info(sf_users_v2)`
  ).all();
  const columns = new Set(
    (result.results || []).map(row => String(row.name))
  );

  if (!columns.has("account_type")) {
    await db.prepare(
      `ALTER TABLE sf_users_v2
       ADD COLUMN account_type TEXT NOT NULL DEFAULT 'sf'`
    ).run();
  }
}

async function ensurePublicProfileShowcaseColumn(db) {
  const result = await db.prepare(
    `PRAGMA table_info(pz_public_profiles_v1)`
  ).all();
  const columns = new Set(
    (result.results || []).map(row => String(row.name))
  );
  if (!columns.has("showcase_roles")) {
    await db.prepare(
      `ALTER TABLE pz_public_profiles_v1
       ADD COLUMN showcase_roles TEXT NOT NULL DEFAULT '[4,0,1]'`
    ).run();
  }
  if (!columns.has("showcase_levels")) {
    await db.prepare(
      `ALTER TABLE pz_public_profiles_v1
       ADD COLUMN showcase_levels TEXT NOT NULL DEFAULT '[1,1,1]'`
    ).run();
  }
}

async function ensureAccountDeletionColumns(db) {
  const result = await db.prepare(
    `PRAGMA table_info(sf_users_v2)`
  ).all();

  const columns = new Set(
    (result.results || []).map(row => String(row.name))
  );

  if (!columns.has("pending_delete")) {
    await db.prepare(
      `ALTER TABLE sf_users_v2
       ADD COLUMN pending_delete INTEGER NOT NULL DEFAULT 0`
    ).run();
  }

  if (!columns.has("delete_at")) {
    await db.prepare(
      `ALTER TABLE sf_users_v2
       ADD COLUMN delete_at INTEGER DEFAULT NULL`
    ).run();
  }
}

async function permanentlyDeleteExpiredAccounts(db) {
  const now = unixTime();

  const result = await db.prepare(
    `SELECT id, email
     FROM sf_users_v2
     WHERE pending_delete = 1
       AND delete_at IS NOT NULL
       AND delete_at <= ?`
  ).bind(now).all();

  for (const user of result.results || []) {
    await permanentlyDeleteAccount(
      db,
      user.id,
      user.email
    );
  }
}

async function permanentlyDeleteAccount(db, userId, email) {
  await db.batch([
    db.prepare(
      `DELETE FROM pz_public_profiles_v1
       WHERE user_id = ?`
    ).bind(userId),

    db.prepare(
      `DELETE FROM pz_blocks_v1
       WHERE blocker_id = ? OR blocked_id = ?`
    ).bind(userId, userId),

    db.prepare(
      `DELETE FROM pz_friend_requests_v1
       WHERE sender_id = ? OR receiver_id = ?`
    ).bind(userId, userId),

    db.prepare(
      `DELETE FROM pz_friendships_v1
       WHERE user_low = ? OR user_high = ?`
    ).bind(userId, userId),

    db.prepare(
      `DELETE FROM sf_sessions_v2
       WHERE user_id = ?`
    ).bind(userId),

    db.prepare(
      `DELETE FROM sf_saves_v2
       WHERE user_id = ?`
    ).bind(userId),

    db.prepare(
      `DELETE FROM sf_email_codes_v2
       WHERE LOWER(email) = LOWER(?)`
    ).bind(email),

    db.prepare(
      `DELETE FROM sf_verification_tickets_v2
       WHERE LOWER(email) = LOWER(?)`
    ).bind(email),

    db.prepare(
      `DELETE FROM sf_users_v2
       WHERE id = ?`
    ).bind(userId)
  ]);
}

async function requestVerificationCode(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);

  if (!isValidEmail(email)) {
    return errorResponse(
      400,
      "INVALID_EMAIL",
      "请输入有效的邮箱地址"
    );
  }

  const existingUser = await env.DB.prepare(
    `SELECT id FROM sf_users_v2
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`
  ).bind(email).first();

  if (existingUser) {
    return errorResponse(
      409,
      "EMAIL_ALREADY_REGISTERED",
      "该邮箱已经注册，请直接登录"
    );
  }

  const now = unixTime();

  const oldCode = await env.DB.prepare(
    `SELECT sent_at
     FROM sf_email_codes_v2
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`
  ).bind(email).first();

  if (
    oldCode &&
    Number(oldCode.sent_at) + CODE_RESEND_SECONDS > now
  ) {
    const retryAfter =
      Number(oldCode.sent_at) + CODE_RESEND_SECONDS - now;

    return jsonResponse({
      success: false,
      code: "CODE_RATE_LIMITED",
      message: `请在 ${retryAfter} 秒后重新发送`,
      retryAfter,
      error: {
        code: "CODE_RATE_LIMITED",
        message: `请在 ${retryAfter} 秒后重新发送`
      }
    }, 429);
  }

  const code = generateSixDigitCode();
  const codeHash = await sha256(
    `${env.SF_MAIL_SECRET}:${email}:${code}`
  );

  const mailResult = await sendVerificationMail(
    env,
    email,
    code
  );

  if (!mailResult.success) {
    console.error("Mail service error:", mailResult);

    return errorResponse(
      502,
      "MAIL_SEND_FAILED",
      mailResult.message || "验证码邮件发送失败"
    );
  }

  await env.DB.prepare(
    `INSERT INTO sf_email_codes_v2 (
      email,
      code_hash,
      expires_at,
      attempts,
      sent_at
    )
    VALUES (?, ?, ?, 0, ?)
    ON CONFLICT(email) DO UPDATE SET
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      attempts = 0,
      sent_at = excluded.sent_at`
  ).bind(
    email,
    codeHash,
    now + CODE_EXPIRE_SECONDS,
    now
  ).run();

  return jsonResponse({
    success: true,
    message: "验证码已发送，请检查邮箱",
    expiresIn: CODE_EXPIRE_SECONDS,
    retryAfter: CODE_RESEND_SECONDS
  });
}

async function sendVerificationMail(env, email, code) {
  let response;

  try {
    response = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      redirect: "follow",
      body: JSON.stringify({
        secret: env.SF_MAIL_SECRET,
        email,
        code
      })
    });
  } catch (error) {
    return {
      success: false,
      message: `无法连接邮件服务：${safeErrorMessage(error)}`
    };
  }

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    console.error("Unexpected Apps Script response:", responseText);

    return {
      success: false,
      message: "邮件服务返回了无法识别的响应"
    };
  }

  if (!response.ok || result.success !== true) {
    return {
      success: false,
      message:
        result.message ||
        result.error ||
        `邮件服务返回 HTTP ${response.status}`
    };
  }

  return {
    success: true
  };
}

async function verifyEmailCode(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const code = String(body.code || "").trim();

  if (!isValidEmail(email)) {
    return errorResponse(
      400,
      "INVALID_EMAIL",
      "请输入有效的邮箱地址"
    );
  }

  if (!/^\d{6}$/.test(code)) {
    return errorResponse(
      400,
      "INVALID_CODE_FORMAT",
      "验证码必须是6位数字"
    );
  }

  const record = await env.DB.prepare(
    `SELECT email, code_hash, expires_at, attempts
     FROM sf_email_codes_v2
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`
  ).bind(email).first();

  if (!record) {
    return errorResponse(
      400,
      "CODE_NOT_FOUND",
      "验证码不存在或已经失效，请重新发送"
    );
  }

  const now = unixTime();

  if (Number(record.expires_at) <= now) {
    await env.DB.prepare(
      `DELETE FROM sf_email_codes_v2
       WHERE LOWER(email) = LOWER(?)`
    ).bind(email).run();

    return errorResponse(
      400,
      "CODE_EXPIRED",
      "验证码已经过期，请重新发送"
    );
  }

  if (Number(record.attempts) >= MAX_CODE_ATTEMPTS) {
    await env.DB.prepare(
      `DELETE FROM sf_email_codes_v2
       WHERE LOWER(email) = LOWER(?)`
    ).bind(email).run();

    return errorResponse(
      429,
      "TOO_MANY_ATTEMPTS",
      "验证码错误次数过多，请重新发送"
    );
  }

  const suppliedHash = await sha256(
    `${env.SF_MAIL_SECRET}:${email}:${code}`
  );

  if (suppliedHash !== record.code_hash) {
    const newAttempts = Number(record.attempts) + 1;

    await env.DB.prepare(
      `UPDATE sf_email_codes_v2
       SET attempts = ?
       WHERE LOWER(email) = LOWER(?)`
    ).bind(newAttempts, email).run();

    const remaining = Math.max(
      0,
      MAX_CODE_ATTEMPTS - newAttempts
    );

    return jsonResponse({
      success: false,
      code: "INVALID_CODE",
      message: `验证码错误，还可尝试 ${remaining} 次`,
      remainingAttempts: remaining,
      error: {
        code: "INVALID_CODE",
        message: `验证码错误，还可尝试 ${remaining} 次`
      }
    }, 401);
  }

  const verificationToken = randomToken(32);
  const ticketHash = await sha256(verificationToken);

  await env.DB.prepare(
    `DELETE FROM sf_email_codes_v2
     WHERE LOWER(email) = LOWER(?)`
  ).bind(email).run();

  await env.DB.prepare(
    `DELETE FROM sf_verification_tickets_v2
     WHERE LOWER(email) = LOWER(?)`
  ).bind(email).run();

  await env.DB.prepare(
    `INSERT INTO sf_verification_tickets_v2 (
      ticket_hash,
      email,
      expires_at,
      created_at
    )
    VALUES (?, ?, ?, ?)`
  ).bind(
    ticketHash,
    email,
    now + VERIFY_TICKET_SECONDS,
    now
  ).run();

  return jsonResponse({
    success: true,
    message: "邮箱验证成功",
    verificationToken,
    expiresIn: VERIFY_TICKET_SECONDS
  });
}

async function completeRegistration(request, env) {
  const body = await readJson(request);

  const verificationToken = String(
    body.verificationToken ||
    body.verificationTicket ||
    body.ticket ||
    ""
  ).trim();

  const password = String(body.password || "");

  if (!verificationToken) {
    return errorResponse(
      400,
      "VERIFICATION_TOKEN_REQUIRED",
      "缺少邮箱验证凭证"
    );
  }

  if (!isValidPassword(password)) {
    return errorResponse(
      400,
      "INVALID_PASSWORD",
      "密码长度必须为8到128个字符"
    );
  }

  const ticketHash = await sha256(verificationToken);

  const ticket = await env.DB.prepare(
    `SELECT ticket_hash, email, expires_at
     FROM sf_verification_tickets_v2
     WHERE ticket_hash = ?
     LIMIT 1`
  ).bind(ticketHash).first();

  if (!ticket) {
    return errorResponse(
      400,
      "INVALID_VERIFICATION_TOKEN",
      "邮箱验证凭证无效，请重新验证邮箱"
    );
  }

  const now = unixTime();

  if (Number(ticket.expires_at) <= now) {
    await env.DB.prepare(
      `DELETE FROM sf_verification_tickets_v2
       WHERE ticket_hash = ?`
    ).bind(ticketHash).run();

    return errorResponse(
      400,
      "VERIFICATION_TOKEN_EXPIRED",
      "邮箱验证已过期，请重新发送验证码"
    );
  }

  const email = normalizeEmail(ticket.email);

  const existingUser = await env.DB.prepare(
    `SELECT id
     FROM sf_users_v2
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`
  ).bind(email).first();

  if (existingUser) {
    await env.DB.prepare(
      `DELETE FROM sf_verification_tickets_v2
       WHERE ticket_hash = ?`
    ).bind(ticketHash).run();

    return errorResponse(
      409,
      "EMAIL_ALREADY_REGISTERED",
      "该邮箱已经注册，请直接登录"
    );
  }

  const username = await generateAvailableUsername(
    env.DB,
    email
  );

  const userId = crypto.randomUUID();
  const passwordSalt = randomHex(16);
  const passwordHash = await hashPassword(
    password,
    passwordSalt
  );

  try {
    await env.DB.prepare(
      `INSERT INTO sf_users_v2 (
        id,
        username,
        email,
        password_hash,
        password_salt,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      username,
      email,
      passwordHash,
      passwordSalt,
      now,
      now
    ).run();
  } catch (error) {
    if (
      String(error?.message || error)
        .toLowerCase()
        .includes("unique")
    ) {
      return errorResponse(
        409,
        "ACCOUNT_ALREADY_EXISTS",
        "用户名或邮箱已经被注册"
      );
    }

    throw error;
  }

  await env.DB.prepare(
    `DELETE FROM sf_verification_tickets_v2
     WHERE ticket_hash = ?`
  ).bind(ticketHash).run();

  const tokens = await createTokenPair(
    env.DB,
    userId
  );

  return jsonResponse({
    success: true,
    message: "账号注册成功",
    user: {
      id: userId,
      username,
      email,
      createdAt: now
    },
    ...tokens
  }, 201);
}

async function createGuestSession(request, env) {
  await readJson(request);
  const now = unixTime();
  const userId = crypto.randomUUID();
  const guestCode = randomHex(5).toUpperCase();
  const username = `Guest_${guestCode}`;
  const email = `guest.${userId}@guest.project-zero.invalid`;
  const passwordSalt = randomHex(16);
  const passwordHash = await hashPassword(
    randomToken(48),
    passwordSalt
  );

  await env.DB.prepare(
    `INSERT INTO sf_users_v2 (
      id,
      username,
      email,
      password_hash,
      password_salt,
      created_at,
      updated_at,
      account_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'guest')`
  ).bind(
    userId,
    username,
    email,
    passwordHash,
    passwordSalt,
    now,
    now
  ).run();

  const tokens = await createTokenPair(env.DB, userId);
  return jsonResponse({
    success: true,
    message: "Guest身份已创建",
    user: publicUser({
      id: userId,
      username,
      email,
      created_at: now,
      account_type: "guest"
    }),
    ...tokens
  }, 201);
}

async function bindGuestAccount(request, env) {
  const session = await authenticate(request, env.DB, "access");
  if (session.error) return session.error;

  if (String(session.user.account_type || "sf") !== "guest") {
    return errorResponse(
      409,
      "ACCOUNT_ALREADY_BOUND",
      "当前账号已经绑定SF Account"
    );
  }

  const body = await readJson(request);
  const verificationToken = String(
    body.verificationToken || body.verificationTicket || body.ticket || ""
  ).trim();
  const password = String(body.password || "");

  if (!verificationToken) {
    return errorResponse(400, "VERIFICATION_TOKEN_REQUIRED", "缺少邮箱验证凭证");
  }
  if (!isValidPassword(password)) {
    return errorResponse(400, "INVALID_PASSWORD", "密码长度必须为8到128个字符");
  }

  const ticketHash = await sha256(verificationToken);
  const ticket = await env.DB.prepare(
    `SELECT ticket_hash, email, expires_at
     FROM sf_verification_tickets_v2
     WHERE ticket_hash = ?
     LIMIT 1`
  ).bind(ticketHash).first();

  if (!ticket) {
    return errorResponse(400, "INVALID_VERIFICATION_TOKEN", "邮箱验证凭证无效，请重新验证邮箱");
  }

  const now = unixTime();
  if (Number(ticket.expires_at) <= now) {
    await env.DB.prepare(
      `DELETE FROM sf_verification_tickets_v2 WHERE ticket_hash = ?`
    ).bind(ticketHash).run();
    return errorResponse(400, "VERIFICATION_TOKEN_EXPIRED", "邮箱验证已过期，请重新发送验证码");
  }

  const email = normalizeEmail(ticket.email);
  const existing = await env.DB.prepare(
    `SELECT id FROM sf_users_v2
     WHERE LOWER(email) = LOWER(?) AND id <> ?
     LIMIT 1`
  ).bind(email, session.user.id).first();
  if (existing) {
    return errorResponse(409, "EMAIL_ALREADY_REGISTERED", "该邮箱已经注册，请使用其他邮箱");
  }

  const username = await generateAvailableUsername(env.DB, email);
  const passwordSalt = randomHex(16);
  const passwordHash = await hashPassword(password, passwordSalt);

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE sf_users_v2
       SET username = ?, email = ?, password_hash = ?, password_salt = ?,
           account_type = 'sf', updated_at = ?
       WHERE id = ? AND account_type = 'guest'`
    ).bind(username, email, passwordHash, passwordSalt, now, session.user.id),
    env.DB.prepare(
      `DELETE FROM sf_verification_tickets_v2 WHERE ticket_hash = ?`
    ).bind(ticketHash),
    env.DB.prepare(
      `DELETE FROM sf_sessions_v2 WHERE user_id = ?`
    ).bind(session.user.id)
  ]);

  const tokens = await createTokenPair(env.DB, session.user.id);
  return jsonResponse({
    success: true,
    message: "Guest已绑定SF Account",
    user: publicUser({
      id: session.user.id,
      username,
      email,
      created_at: session.user.created_at,
      account_type: "sf"
    }),
    ...tokens
  });
}

async function deleteGuestAccount(request, env) {
  const session = await authenticate(request, env.DB, "access");
  if (session.error) return session.error;

  if (String(session.user.account_type || "sf") !== "guest") {
    return errorResponse(
      409,
      "NOT_GUEST_ACCOUNT",
      "只有Guest匿名身份可以通过此接口立即删除"
    );
  }

  await permanentlyDeleteAccount(
    env.DB,
    session.user.id,
    session.user.email
  );

  return jsonResponse({
    success: true,
    deleted: true,
    message: "Guest匿名身份、本地关联和社交数据已删除"
  });
}

async function login(request, env) {
  const body = await readJson(request);

  const identifier = String(
    body.identifier ||
    body.username ||
    body.email ||
    ""
  ).trim();

  const password = String(body.password || "");

  if (!identifier || !password) {
    return errorResponse(
      400,
      "MISSING_CREDENTIALS",
      "请输入用户名或邮箱以及密码"
    );
  }

  const user = await env.DB.prepare(
    `SELECT
      id,
      username,
      email,
      password_hash,
      password_salt,
      created_at,
      account_type,
      pending_delete,
      delete_at
    FROM sf_users_v2
    WHERE username = ?
       OR LOWER(email) = LOWER(?)
    LIMIT 1`
  ).bind(identifier, identifier).first();

  if (!user) {
    return errorResponse(
      401,
      "INVALID_CREDENTIALS",
      "用户名、邮箱或密码错误"
    );
  }

  const passwordHash = await hashPassword(
    password,
    user.password_salt
  );

  if (passwordHash !== user.password_hash) {
    return errorResponse(
      401,
      "INVALID_CREDENTIALS",
      "用户名、邮箱或密码错误"
    );
  }

  const now = unixTime();
  const deletionPending = Number(user.pending_delete) === 1;
  const deleteAt = deletionPending
    ? Number(user.delete_at || 0)
    : 0;

  if (deletionPending && deleteAt > 0 && deleteAt <= now) {
    await permanentlyDeleteAccount(
      env.DB,
      user.id,
      user.email
    );

    return errorResponse(
      404,
      "ACCOUNT_DELETED",
      "该账号已经永久删除"
    );
  }

  const tokens = await createTokenPair(
    env.DB,
    user.id
  );

  return jsonResponse({
    success: true,
    message: deletionPending
      ? "账号处于7天注销期"
      : "登录成功",
    deletionPending,
    deleteAt: deletionPending ? deleteAt : null,
    deletionPeriodDays: 7,
    remainingSeconds: deletionPending
      ? Math.max(0, deleteAt - now)
      : 0,
    user: publicUser(user),
    ...tokens
  });
}

async function getSession(request, env) {
  const session = await authenticate(
    request,
    env.DB,
    "access"
  );

  if (session.error) {
    return session.error;
  }

  const now = unixTime();
  const deletionPending = Number(session.user.pending_delete) === 1;
  const deleteAt = deletionPending
    ? Number(session.user.delete_at || 0)
    : 0;

  return jsonResponse({
    success: true,
    authenticated: true,
    deletionPending,
    deleteAt: deletionPending ? deleteAt : null,
    deletionPeriodDays: 7,
    remainingSeconds: deletionPending
      ? Math.max(0, deleteAt - now)
      : 0,
    user: publicUser(session.user)
  });
}

async function refreshSession(request, env) {
  const body = await readJson(request);

  const refreshToken = String(
    body.refreshToken || ""
  ).trim();

  if (!refreshToken) {
    return errorResponse(
      400,
      "REFRESH_TOKEN_REQUIRED",
      "缺少刷新令牌"
    );
  }

  const tokenHash = await sha256(refreshToken);
  const now = unixTime();

  const session = await env.DB.prepare(
    `SELECT
      s.token_hash,
      s.user_id,
      s.expires_at,
      u.id,
      u.username,
      u.email,
      u.created_at,
      u.account_type,
      u.pending_delete,
      u.delete_at
    FROM sf_sessions_v2 s
    JOIN sf_users_v2 u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.token_type = 'refresh'
    LIMIT 1`
  ).bind(tokenHash).first();

  if (!session || Number(session.expires_at) <= now) {
    if (session) {
      await env.DB.prepare(
        `DELETE FROM sf_sessions_v2
         WHERE token_hash = ?`
      ).bind(tokenHash).run();
    }

    return errorResponse(
      401,
      "INVALID_REFRESH_TOKEN",
      "刷新令牌无效或已经过期"
    );
  }

  const deletionPending = Number(session.pending_delete) === 1;
  const deleteAt = deletionPending
    ? Number(session.delete_at || 0)
    : 0;

  if (deletionPending && deleteAt > 0 && deleteAt <= now) {
    await permanentlyDeleteAccount(
      env.DB,
      session.user_id,
      session.email
    );

    return errorResponse(
      404,
      "ACCOUNT_DELETED",
      "该账号已经永久删除"
    );
  }

  await env.DB.prepare(
    `DELETE FROM sf_sessions_v2
     WHERE token_hash = ?`
  ).bind(tokenHash).run();

  const tokens = await createTokenPair(
    env.DB,
    session.user_id
  );

  return jsonResponse({
    success: true,
    deletionPending,
    deleteAt: deletionPending ? deleteAt : null,
    deletionPeriodDays: 7,
    remainingSeconds: deletionPending
      ? Math.max(0, deleteAt - now)
      : 0,
    user: publicUser(session),
    ...tokens
  });
}

async function logout(request, env) {
  const token = getBearerToken(request);

  let refreshToken = "";
  try {
    const body = await request.clone().json();
    refreshToken = String(body?.refreshToken || "").trim();
  } catch (_) {}

  if (!token && !refreshToken) {
    return jsonResponse({
      success: true,
      message: "已退出登录"
    });
  }

  const statements = [];
  if (token) {
    const tokenHash = await sha256(token);
    statements.push(env.DB.prepare(
      `DELETE FROM sf_sessions_v2 WHERE token_hash = ?`
    ).bind(tokenHash));
  }
  if (refreshToken) {
    const refreshHash = await sha256(refreshToken);
    statements.push(env.DB.prepare(
      `DELETE FROM sf_sessions_v2 WHERE token_hash = ?`
    ).bind(refreshHash));
  }
  if (statements.length) await env.DB.batch(statements);

  return jsonResponse({
    success: true,
    message: "已退出登录"
  });
}

async function requestAccountDeletion(request, env) {
  const session = await authenticate(
    request,
    env.DB,
    "access"
  );

  if (session.error) {
    return session.error;
  }

  const userId = session.user.id;
  const now = unixTime();
  const deleteAt = now + ACCOUNT_DELETION_SECONDS;

  const user = await env.DB.prepare(
    `SELECT
      id,
      email,
      pending_delete,
      delete_at
     FROM sf_users_v2
     WHERE id = ?
     LIMIT 1`
  ).bind(userId).first();

  if (!user) {
    return errorResponse(
      404,
      "ACCOUNT_NOT_FOUND",
      "账号不存在"
    );
  }

  if (Number(user.pending_delete) === 1) {
    const existingDeleteAt = Number(
      user.delete_at || deleteAt
    );

    return jsonResponse({
      success: true,
      alreadyRequested: true,
      message: "该账号已经进入7天注销期",
      deleteAt: existingDeleteAt,
      deletionPeriodDays: 7,
      remainingSeconds: Math.max(
        0,
        existingDeleteAt - now
      )
    });
  }

  await env.DB.prepare(
    `UPDATE sf_users_v2
     SET
       pending_delete = 1,
       delete_at = ?,
       updated_at = ?
     WHERE id = ?`
  ).bind(deleteAt, now, userId).run();

  return jsonResponse({
    success: true,
    message: "账号已进入7天注销期，期满后将永久删除",
    deleteAt,
    deletionPeriodDays: 7,
    remainingSeconds: ACCOUNT_DELETION_SECONDS
  });
}

async function cancelAccountDeletion(request, env) {
  const session = await authenticate(
    request,
    env.DB,
    "access"
  );

  if (session.error) {
    return session.error;
  }

  const user = await env.DB.prepare(
    `SELECT
      id,
      username,
      email,
      created_at,
      account_type,
      pending_delete,
      delete_at
     FROM sf_users_v2
     WHERE id = ?
     LIMIT 1`
  ).bind(session.user.id).first();

  if (!user) {
    return errorResponse(
      404,
      "ACCOUNT_NOT_FOUND",
      "账号不存在"
    );
  }

  if (Number(user.pending_delete) !== 1) {
    return jsonResponse({
      success: true,
      canceled: false,
      message: "该账号当前没有注销申请",
      account: {
        pendingDeletion: false,
        deleteAt: null,
        remainingSeconds: 0
      }
    });
  }

  const now = unixTime();
  const deleteAt = Number(user.delete_at || 0);

  if (deleteAt > 0 && deleteAt <= now) {
    await permanentlyDeleteAccount(
      env.DB,
      user.id,
      user.email
    );

    return errorResponse(
      404,
      "ACCOUNT_DELETED",
      "该账号已经永久删除"
    );
  }

  await env.DB.prepare(
    `UPDATE sf_users_v2
     SET
       pending_delete = 0,
       delete_at = NULL,
       updated_at = ?
     WHERE id = ?`
  ).bind(now, user.id).run();

  return jsonResponse({
    success: true,
    canceled: true,
    message: "账号注销申请已取消",
    user: publicUser(user),
    account: {
      pendingDeletion: false,
      deleteAt: null,
      remainingSeconds: 0
    }
  });
}

async function getAccountMeta(request, env) {
  const session = await authenticate(
    request,
    env.DB,
    "access"
  );

  if (session.error) {
    return session.error;
  }

  const user = await env.DB.prepare(
    `SELECT
      id,
      username,
      email,
      created_at,
      account_type,
      pending_delete,
      delete_at
     FROM sf_users_v2
     WHERE id = ?
     LIMIT 1`
  ).bind(session.user.id).first();

  if (!user) {
    return errorResponse(
      404,
      "ACCOUNT_NOT_FOUND",
      "账号不存在"
    );
  }

  const now = unixTime();
  const pendingDeletion =
    Number(user.pending_delete) === 1;
  const deleteAt = pendingDeletion
    ? Number(user.delete_at || 0)
    : 0;

  return jsonResponse({
    success: true,
    user: publicUser(user),
    account: {
      pendingDeletion,
      deletionPeriodDays: 7,
      deleteAt: deleteAt || null,
      remainingSeconds: pendingDeletion
        ? Math.max(0, deleteAt - now)
        : 0
    }
  });
}

async function authenticateFriendRequest(request, env) {
  const session = await authenticate(
    request,
    env.DB,
    "access"
  );

  if (session.error) {
    return session;
  }

  if (Number(session.user.pending_delete) === 1) {
    return {
      error: errorResponse(
        403,
        "ACCOUNT_PENDING_DELETION",
        "账号处于注销期，无法使用好友功能"
      )
    };
  }

  return session;
}

async function updatePublicProfile(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;

  const body = await readJson(request);
  const playerUid = String(body.playerUid || "").trim();
  const displayName = String(body.displayName || "").trim();
  const level = Math.max(1, Math.min(999, Math.floor(Number(body.level) || 1)));
  const avatarRole = Math.max(0, Math.min(99, Math.floor(Number(body.avatarRole) || 0)));
  const avatarFrame = String(body.avatarFrame || "zero").trim().slice(0, 32) || "zero";
  let showcaseRoles;
  let existingProfile = null;
  if (Array.isArray(body.showcaseRoles) || typeof body.showcaseRoles === "string") {
    showcaseRoles = normalizeShowcaseRoles(body.showcaseRoles);
  } else {
    existingProfile = await env.DB.prepare(
      `SELECT showcase_roles, showcase_levels FROM pz_public_profiles_v1 WHERE user_id = ? LIMIT 1`
    ).bind(session.user.id).first();
    showcaseRoles = normalizeShowcaseRoles(existingProfile?.showcase_roles);
  }
  if (!existingProfile && !Array.isArray(body.showcaseLevels)) {
    existingProfile = await env.DB.prepare(
      `SELECT showcase_levels FROM pz_public_profiles_v1 WHERE user_id = ? LIMIT 1`
    ).bind(session.user.id).first();
  }
  const showcaseLevels = normalizeShowcaseLevels(
    Array.isArray(body.showcaseLevels) ? body.showcaseLevels : existingProfile?.showcase_levels,
    showcaseRoles.length
  );

  if (!/^[A-Za-z0-9_-]{4,32}$/.test(playerUid)) {
    return errorResponse(400, "INVALID_PLAYER_UID", "玩家UID格式无效");
  }
  if (!displayName || displayName.length > 24) {
    return errorResponse(400, "INVALID_DISPLAY_NAME", "玩家名称长度必须为1到24个字符");
  }

  try {
    await env.DB.prepare(
      `INSERT INTO pz_public_profiles_v1 (
        user_id, player_uid, display_name, level,
        avatar_role, avatar_frame, showcase_roles, showcase_levels, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        player_uid = excluded.player_uid,
        display_name = excluded.display_name,
        level = excluded.level,
        avatar_role = excluded.avatar_role,
        avatar_frame = excluded.avatar_frame,
        showcase_roles = excluded.showcase_roles,
        showcase_levels = excluded.showcase_levels,
        updated_at = excluded.updated_at`
    ).bind(
      session.user.id, playerUid, displayName, level,
      avatarRole, avatarFrame, JSON.stringify(showcaseRoles), JSON.stringify(showcaseLevels), unixTime()
    ).run();
  } catch (error) {
    if (String(error?.message || error).toLowerCase().includes("unique")) {
      return errorResponse(409, "PLAYER_UID_ALREADY_USED", "该玩家UID已被其他账号使用");
    }
    throw error;
  }

  return jsonResponse({
    success: true,
    profile: {
      accountId: String(session.user.id),
      accountType: String(session.user.account_type || "sf"),
      playerUid, displayName, level, avatarRole, avatarFrame, showcaseRoles, showcaseLevels
    }
  });
}

function friendProfileSelect(userAlias = "u", saveAlias = "s") {
  return `${userAlias}.id AS account_id,
    ${userAlias}.username,
    ${userAlias}.account_type,
    COALESCE(
      (SELECT p.display_name FROM pz_public_profiles_v1 p
       WHERE p.user_id = ${userAlias}.id),
      json_extract(${saveAlias}.save_data, '$.playerName'),
      ${userAlias}.username
    ) AS display_name,
    COALESCE(
      (SELECT p.player_uid FROM pz_public_profiles_v1 p
       WHERE p.user_id = ${userAlias}.id),
      json_extract(${saveAlias}.save_data, '$.playerUID'),
      '--------'
    ) AS player_uid,
    COALESCE(
      (SELECT p.level FROM pz_public_profiles_v1 p
       WHERE p.user_id = ${userAlias}.id),
      json_extract(${saveAlias}.save_data, '$.playerLevel'),
      1
    ) AS level,
    COALESCE(
      (SELECT p.avatar_role FROM pz_public_profiles_v1 p
       WHERE p.user_id = ${userAlias}.id),
      json_extract(${saveAlias}.save_data, '$.profileAvatarRole'),
      4
    ) AS avatar_role,
    COALESCE(
      (SELECT p.avatar_frame FROM pz_public_profiles_v1 p
       WHERE p.user_id = ${userAlias}.id),
      json_extract(${saveAlias}.save_data, '$.profileAvatarFrame'),
      'zero'
    ) AS avatar_frame,
    COALESCE(
      (SELECT p.showcase_roles FROM pz_public_profiles_v1 p
       WHERE p.user_id = ${userAlias}.id),
      json_extract(${saveAlias}.save_data, '$.profileShowcase'),
      '[4,0,1]'
    ) AS showcase_roles,
    COALESCE(
      (SELECT p.showcase_levels FROM pz_public_profiles_v1 p
       WHERE p.user_id = ${userAlias}.id),
      '[1,1,1]'
    ) AS showcase_levels`;
}

function formatFriendProfile(row) {
  return {
    accountId: String(row.account_id),
    accountType: String(row.account_type || "sf"),
    username: String(row.username || ""),
    displayName: String(
      row.display_name || row.username || "PLAYER"
    ),
    playerUid: String(row.player_uid || "--------"),
    level: Math.max(1, Number(row.level) || 1),
    avatarRole: Math.max(0, Number(row.avatar_role) || 0),
    avatarFrame: String(row.avatar_frame || "zero"),
    showcaseRoles: normalizeShowcaseRoles(row.showcase_roles),
    showcaseLevels: normalizeShowcaseLevels(row.showcase_levels, 3)
  };
}

function normalizeShowcaseRoles(value) {
  let source = value;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { source = []; }
  }
  if (!Array.isArray(source)) source = [];
  const result = [];
  for (const raw of source) {
    const roleId = Math.max(0, Math.min(5, Math.floor(Number(raw) || 0)));
    if (!result.includes(roleId)) result.push(roleId);
    if (result.length >= 3) break;
  }
  for (const fallback of [4, 0, 1]) {
    if (result.length >= 3) break;
    if (!result.includes(fallback)) result.push(fallback);
  }
  return result;
}

function normalizeShowcaseLevels(value, count = 3) {
  let source = value;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { source = []; }
  }
  if (!Array.isArray(source)) source = [];
  return Array.from({ length: Math.max(1, Math.min(3, count)) }, (_, index) =>
    Math.max(1, Math.min(60, Math.floor(Number(source[index]) || 1)))
  );
}

async function loadFriendProfilesByIds(db, ids) {
  const uniqueIds = [...new Set(
    ids.map(value => String(value || "")).filter(Boolean)
  )];

  if (!uniqueIds.length) {
    return [];
  }

  const placeholders = uniqueIds.map(() => "?").join(",");
  const result = await db.prepare(
    `SELECT ${friendProfileSelect()}
     FROM sf_users_v2 u
     LEFT JOIN sf_saves_v2 s
       ON s.user_id = u.id
      AND s.game_id = 'project-zero'
     WHERE u.id IN (${placeholders})
       AND COALESCE(u.pending_delete, 0) = 0`
  ).bind(...uniqueIds).all();

  const profileMap = new Map(
    (result.results || []).map(row => [
      String(row.account_id),
      formatFriendProfile(row)
    ])
  );

  return uniqueIds
    .map(id => profileMap.get(id))
    .filter(Boolean);
}

async function countFriends(db, userId) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS count
     FROM pz_friendships_v1
     WHERE user_low = ? OR user_high = ?`
  ).bind(userId, userId).first();

  return Number(row?.count || 0);
}

async function countOutgoingFriendRequests(db, userId) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS count
     FROM pz_friend_requests_v1
     WHERE sender_id = ? AND status = 'pending'`
  ).bind(userId).first();

  return Number(row?.count || 0);
}

function orderedFriendPair(firstId, secondId) {
  const first = String(firstId);
  const second = String(secondId);

  return first < second
    ? [first, second]
    : [second, first];
}

async function isBlockedBetween(db, firstId, secondId) {
  const row = await db.prepare(
    `SELECT 1 AS found
     FROM pz_blocks_v1
     WHERE (blocker_id = ? AND blocked_id = ?)
        OR (blocker_id = ? AND blocked_id = ?)
     LIMIT 1`
  ).bind(firstId, secondId, secondId, firstId).first();
  return Boolean(row);
}

async function buildFriendCenter(db, userId) {
  const friendships = await db.prepare(
    `SELECT
       CASE
         WHEN user_low = ? THEN user_high
         ELSE user_low
       END AS friend_id,
       created_at
     FROM pz_friendships_v1
     WHERE user_low = ? OR user_high = ?
     ORDER BY created_at DESC`
  ).bind(userId, userId, userId).all();

  const incoming = await db.prepare(
    `SELECT id, sender_id, created_at
     FROM pz_friend_requests_v1
     WHERE receiver_id = ? AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 30`
  ).bind(userId).all();

  const outgoing = await db.prepare(
    `SELECT id, receiver_id, created_at
     FROM pz_friend_requests_v1
     WHERE sender_id = ? AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 30`
  ).bind(userId).all();

  const friendshipRows = friendships.results || [];
  const incomingRows = incoming.results || [];
  const outgoingRows = outgoing.results || [];

  const profiles = await loadFriendProfilesByIds(db, [
    ...friendshipRows.map(row => row.friend_id),
    ...incomingRows.map(row => row.sender_id),
    ...outgoingRows.map(row => row.receiver_id)
  ]);

  const profileMap = new Map(
    profiles.map(profile => [profile.accountId, profile])
  );

  const blockData = await buildBlockList(db, userId);

  return {
    success: true,
    limit: FRIEND_LIMIT,
    friends: friendshipRows.map(row => ({
      ...profileMap.get(String(row.friend_id)),
      friendsSince: Number(row.created_at)
    })).filter(profile => profile.accountId),
    incomingRequests: incomingRows.map(row => ({
      ...profileMap.get(String(row.sender_id)),
      requestId: row.id,
      requestedAt: Number(row.created_at)
    })).filter(profile => profile.accountId),
    outgoingRequests: outgoingRows.map(row => ({
      ...profileMap.get(String(row.receiver_id)),
      requestId: row.id,
      requestedAt: Number(row.created_at)
    })).filter(profile => profile.accountId),
    blocked: blockData.blocked
  };
}

async function getFriendCenter(request, env) {
  const session = await authenticateFriendRequest(request, env);

  if (session.error) {
    return session.error;
  }

  return jsonResponse(
    await buildFriendCenter(env.DB, session.user.id)
  );
}

async function searchFriendProfiles(request, env, url) {
  const session = await authenticateFriendRequest(request, env);

  if (session.error) {
    return session.error;
  }

  const query = String(
    url.searchParams.get("q") || ""
  ).trim();

  if (query.length < 2) {
    return errorResponse(
      400,
      "FRIEND_QUERY_TOO_SHORT",
      "搜索内容至少需要2个字符"
    );
  }

  if (query.length > 64) {
    return errorResponse(
      400,
      "FRIEND_QUERY_TOO_LONG",
      "搜索内容不能超过64个字符"
    );
  }

  const escapedLike = query.replace(/[\\%_]/g, "\\$&");
  const like = `%${escapedLike}%`;

  const result = await env.DB.prepare(
    `SELECT ${friendProfileSelect()}
     FROM sf_users_v2 u
     LEFT JOIN sf_saves_v2 s
       ON s.user_id = u.id
      AND s.game_id = 'project-zero'
     WHERE u.id <> ?
       AND COALESCE(u.pending_delete, 0) = 0
       AND NOT EXISTS (
         SELECT 1 FROM pz_blocks_v1 b
         WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
            OR (b.blocker_id = u.id AND b.blocked_id = ?)
       )
       AND (
         u.id = ?
         OR LOWER(u.username) LIKE LOWER(?) ESCAPE '\\'
         OR (SELECT p.player_uid FROM pz_public_profiles_v1 p
             WHERE p.user_id = u.id) = ?
         OR LOWER((SELECT p.display_name FROM pz_public_profiles_v1 p
                   WHERE p.user_id = u.id)) LIKE LOWER(?) ESCAPE '\\'
         OR CAST(json_extract(s.save_data, '$.playerUID') AS TEXT) = ?
         OR LOWER(
           CAST(json_extract(s.save_data, '$.playerName') AS TEXT)
         ) LIKE LOWER(?) ESCAPE '\\'
       )
     ORDER BY
       CASE
         WHEN u.id = ?
           OR LOWER(u.username) = LOWER(?)
           OR (SELECT p.player_uid FROM pz_public_profiles_v1 p
               WHERE p.user_id = u.id) = ?
           OR CAST(json_extract(s.save_data, '$.playerUID') AS TEXT) = ?
         THEN 0
         ELSE 1
       END,
       u.username
     LIMIT 12`
  ).bind(
    session.user.id,
    session.user.id,
    session.user.id,
    query,
    like,
    query,
    like,
    query,
    like,
    query,
    query,
    query,
    query
  ).all();

  return jsonResponse({
    success: true,
    results: (result.results || []).map(formatFriendProfile)
  });
}

async function getGlobalSupportOperators(request, env, url) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;

  const requested = String(url.searchParams.get("profession") || "all");
  const profession = ["all", "swordguard", "shieldguard", "breaker", "marksman", "arcane", "assist", "medic", "leader"]
    .includes(requested) ? requested : "all";
  const seed = Math.max(0, Math.floor(Number(url.searchParams.get("seed")) || 0));

  const result = await env.DB.prepare(
    `SELECT ${friendProfileSelect()}
     FROM sf_users_v2 u
     LEFT JOIN sf_saves_v2 s
       ON s.user_id = u.id AND s.game_id = 'project-zero'
     WHERE u.id <> ?
       AND COALESCE(u.pending_delete, 0) = 0
       AND (s.user_id IS NOT NULL OR EXISTS (
         SELECT 1 FROM pz_public_profiles_v1 p WHERE p.user_id = u.id
       ))
       AND NOT EXISTS (
         SELECT 1 FROM pz_blocks_v1 b
         WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
            OR (b.blocker_id = u.id AND b.blocked_id = ?)
       )
     ORDER BY (((length(u.id) * 1103515245 +
       length(COALESCE(u.username, '')) * 12345) * (? + 1)) & 2147483647), u.id
     LIMIT 40`
  ).bind(session.user.id, session.user.id, session.user.id, seed * 7919).all();

  const professionOf = roleId => ["swordguard", "assist", "breaker", "arcane", "leader", "medic"][roleId] || "leader";
  const operators = [];
  for (const row of result.results || []) {
    const provider = formatFriendProfile(row);
    for (let index = 0; index < provider.showcaseRoles.length; index++) {
      const roleId = provider.showcaseRoles[index];
      const roleProfession = professionOf(roleId);
      if (profession !== "all" && profession !== roleProfession) continue;
      operators.push({
        roleId,
        profession: roleProfession,
        accountId: provider.accountId,
        owner: provider.displayName,
        playerUid: provider.playerUid,
        roleLevel: Math.max(1, Math.min(60, Math.floor(Number(provider.showcaseLevels[index]) || 1)))
      });
      if (operators.length >= 24) break;
    }
    if (operators.length >= 24) break;
  }

  return jsonResponse({ success: true, profession, seed, operators });
}

async function resolveFriendTarget(db, target) {
  return db.prepare(
    `SELECT u.id
     FROM sf_users_v2 u
     LEFT JOIN sf_saves_v2 s
       ON s.user_id = u.id
      AND s.game_id = 'project-zero'
     WHERE COALESCE(u.pending_delete, 0) = 0
       AND (
         u.id = ?
         OR LOWER(u.username) = LOWER(?)
         OR (SELECT p.player_uid FROM pz_public_profiles_v1 p
             WHERE p.user_id = u.id) = ?
         OR CAST(json_extract(s.save_data, '$.playerUID') AS TEXT) = ?
       )
     LIMIT 1`
  ).bind(target, target, target, target).first();
}

async function createFriendRequest(request, env) {
  const session = await authenticateFriendRequest(request, env);

  if (session.error) {
    return session.error;
  }

  const body = await readJson(request);
  const targetText = String(body.target || "").trim();

  if (!targetText || targetText.length > 64) {
    return errorResponse(
      400,
      "FRIEND_TARGET_REQUIRED",
      "请输入有效的玩家UID或用户名"
    );
  }

  const target = await resolveFriendTarget(env.DB, targetText);

  if (!target) {
    return errorResponse(
      404,
      "FRIEND_TARGET_NOT_FOUND",
      "未找到该玩家"
    );
  }

  if (String(target.id) === String(session.user.id)) {
    return errorResponse(
      400,
      "FRIEND_SELF_REQUEST",
      "不能添加自己为好友"
    );
  }

  if (await isBlockedBetween(env.DB, session.user.id, target.id)) {
    return errorResponse(
      403,
      "FRIEND_BLOCKED",
      "无法向该玩家发送好友申请"
    );
  }

  const [userLow, userHigh] = orderedFriendPair(
    session.user.id,
    target.id
  );

  const existingFriend = await env.DB.prepare(
    `SELECT 1 AS found
     FROM pz_friendships_v1
     WHERE user_low = ? AND user_high = ?
     LIMIT 1`
  ).bind(userLow, userHigh).first();

  if (existingFriend) {
    return errorResponse(
      409,
      "FRIEND_ALREADY_EXISTS",
      "该玩家已经是你的好友"
    );
  }

  if (
    await countFriends(env.DB, session.user.id) >= FRIEND_LIMIT ||
    await countFriends(env.DB, target.id) >= FRIEND_LIMIT
  ) {
    return errorResponse(
      409,
      "FRIEND_LIMIT_REACHED",
      "其中一方的好友数量已达15人上限"
    );
  }

  if (
    await countOutgoingFriendRequests(env.DB, session.user.id) >=
      FRIEND_OUTGOING_LIMIT
  ) {
    return errorResponse(
      429,
      "FRIEND_REQUEST_LIMIT_REACHED",
      "待处理的好友申请过多，请稍后再试"
    );
  }

  const pending = await env.DB.prepare(
    `SELECT id
     FROM pz_friend_requests_v1
     WHERE status = 'pending'
       AND (
         (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
       )
     LIMIT 1`
  ).bind(
    session.user.id,
    target.id,
    target.id,
    session.user.id
  ).first();

  if (pending) {
    return errorResponse(
      409,
      "FRIEND_REQUEST_EXISTS",
      "双方之间已经存在待处理的好友申请"
    );
  }

  const now = unixTime();

  try {
    await env.DB.prepare(
      `INSERT INTO pz_friend_requests_v1 (
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 'pending', ?, ?)`
    ).bind(
      crypto.randomUUID(),
      session.user.id,
      target.id,
      now,
      now
    ).run();
  } catch (error) {
    if (String(error?.message || error).toLowerCase().includes("unique")) {
      return errorResponse(
        409,
        "FRIEND_REQUEST_EXISTS",
        "好友申请已经发送"
      );
    }

    throw error;
  }

  return jsonResponse(
    await buildFriendCenter(env.DB, session.user.id),
    201
  );
}

async function respondToFriendRequest(request, env) {
  const session = await authenticateFriendRequest(request, env);

  if (session.error) {
    return session.error;
  }

  const body = await readJson(request);
  const requestId = String(body.requestId || "").trim();
  const action = String(body.action || "").trim();

  if (!requestId || !["accept", "reject"].includes(action)) {
    return errorResponse(
      400,
      "INVALID_FRIEND_RESPONSE",
      "好友申请操作无效"
    );
  }

  const friendRequest = await env.DB.prepare(
    `SELECT id, sender_id, receiver_id
     FROM pz_friend_requests_v1
     WHERE id = ?
       AND receiver_id = ?
       AND status = 'pending'
     LIMIT 1`
  ).bind(requestId, session.user.id).first();

  if (!friendRequest) {
    return errorResponse(
      404,
      "FRIEND_REQUEST_NOT_FOUND",
      "好友申请不存在或已经处理"
    );
  }

  const now = unixTime();

  if (action === "accept") {
    if (await isBlockedBetween(
      env.DB,
      session.user.id,
      friendRequest.sender_id
    )) {
      await env.DB.prepare(
        `UPDATE pz_friend_requests_v1
         SET status = 'closed', updated_at = ?
         WHERE id = ?`
      ).bind(now, requestId).run();
      return errorResponse(403, "FRIEND_BLOCKED", "双方存在黑名单关系，无法添加好友");
    }
    if (
      await countFriends(env.DB, session.user.id) >= FRIEND_LIMIT ||
      await countFriends(env.DB, friendRequest.sender_id) >= FRIEND_LIMIT
    ) {
      return errorResponse(
        409,
        "FRIEND_LIMIT_REACHED",
        "其中一方的好友数量已达15人上限"
      );
    }

    const [userLow, userHigh] = orderedFriendPair(
      session.user.id,
      friendRequest.sender_id
    );

    await env.DB.batch([
      env.DB.prepare(
        `INSERT OR IGNORE INTO pz_friendships_v1 (
          user_low,
          user_high,
          created_at
        )
        VALUES (?, ?, ?)`
      ).bind(userLow, userHigh, now),

      env.DB.prepare(
        `UPDATE pz_friend_requests_v1
         SET status = 'accepted', updated_at = ?
         WHERE id = ? AND status = 'pending'`
      ).bind(now, requestId),

      env.DB.prepare(
        `UPDATE pz_friend_requests_v1
         SET status = 'closed', updated_at = ?
         WHERE status = 'pending'
           AND (
             (sender_id = ? AND receiver_id = ?)
             OR (sender_id = ? AND receiver_id = ?)
           )`
      ).bind(
        now,
        session.user.id,
        friendRequest.sender_id,
        friendRequest.sender_id,
        session.user.id
      )
    ]);
  } else {
    await env.DB.prepare(
      `UPDATE pz_friend_requests_v1
       SET status = 'rejected', updated_at = ?
       WHERE id = ? AND status = 'pending'`
    ).bind(now, requestId).run();
  }

  return jsonResponse(
    await buildFriendCenter(env.DB, session.user.id)
  );
}

async function deleteFriend(request, env, path) {
  const session = await authenticateFriendRequest(request, env);

  if (session.error) {
    return session.error;
  }

  let targetId = "";

  try {
    targetId = decodeURIComponent(
      path.slice("/api/friends/".length)
    ).trim();
  } catch {
    return errorResponse(
      400,
      "INVALID_FRIEND_ID",
      "好友ID格式无效"
    );
  }

  if (!targetId || targetId.length > 128) {
    return errorResponse(
      400,
      "FRIEND_ID_REQUIRED",
      "缺少好友ID"
    );
  }

  const [userLow, userHigh] = orderedFriendPair(
    session.user.id,
    targetId
  );

  const result = await env.DB.prepare(
    `DELETE FROM pz_friendships_v1
     WHERE user_low = ? AND user_high = ?`
  ).bind(userLow, userHigh).run();

  if (!Number(result.meta?.changes || 0)) {
    return errorResponse(
      404,
      "FRIEND_NOT_FOUND",
      "好友关系不存在"
    );
  }

  return jsonResponse(
    await buildFriendCenter(env.DB, session.user.id)
  );
}

async function buildBlockList(db, userId) {
  const rows = await db.prepare(
    `SELECT blocked_id, created_at
     FROM pz_blocks_v1
     WHERE blocker_id = ?
     ORDER BY created_at DESC`
  ).bind(userId).all();
  const blockRows = rows.results || [];
  const profiles = await loadFriendProfilesByIds(
    db,
    blockRows.map(row => row.blocked_id)
  );
  const profileMap = new Map(
    profiles.map(profile => [profile.accountId, profile])
  );
  return {
    success: true,
    blocked: blockRows.map(row => ({
      ...profileMap.get(String(row.blocked_id)),
      blockedAt: Number(row.created_at)
    })).filter(profile => profile.accountId)
  };
}

async function getBlockList(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  return jsonResponse(await buildBlockList(env.DB, session.user.id));
}

async function blockPlayer(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  const body = await readJson(request);
  const targetText = String(body.target || "").trim();
  const target = await resolveFriendTarget(env.DB, targetText);
  if (!target) return errorResponse(404, "FRIEND_TARGET_NOT_FOUND", "未找到该玩家");
  if (String(target.id) === String(session.user.id)) {
    return errorResponse(400, "BLOCK_SELF", "不能将自己加入黑名单");
  }

  const now = unixTime();
  const [userLow, userHigh] = orderedFriendPair(session.user.id, target.id);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO pz_blocks_v1 (blocker_id, blocked_id, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(blocker_id, blocked_id) DO NOTHING`
    ).bind(session.user.id, target.id, now),
    env.DB.prepare(
      `DELETE FROM pz_friendships_v1
       WHERE user_low = ? AND user_high = ?`
    ).bind(userLow, userHigh),
    env.DB.prepare(
      `UPDATE pz_friend_requests_v1
       SET status = 'closed', updated_at = ?
       WHERE status = 'pending'
         AND ((sender_id = ? AND receiver_id = ?)
           OR (sender_id = ? AND receiver_id = ?))`
    ).bind(now, session.user.id, target.id, target.id, session.user.id)
  ]);
  return jsonResponse(await buildFriendCenter(env.DB, session.user.id));
}

async function unblockPlayer(request, env, path) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  let targetId = "";
  try {
    targetId = decodeURIComponent(path.slice("/api/blocks/".length)).trim();
  } catch {
    return errorResponse(400, "INVALID_BLOCK_ID", "黑名单玩家ID格式无效");
  }
  if (!targetId) return errorResponse(400, "BLOCK_ID_REQUIRED", "缺少黑名单玩家ID");
  await env.DB.prepare(
    `DELETE FROM pz_blocks_v1
     WHERE blocker_id = ? AND blocked_id = ?`
  ).bind(session.user.id, targetId).run();
  return jsonResponse(await buildBlockList(env.DB, session.user.id));
}

async function handleSaves(request, env, url) {
  const session = await authenticate(
    request,
    env.DB,
    "access"
  );

  if (session.error) {
    return session.error;
  }

  const userId = session.user.id;

  if (String(session.user.account_type || "sf") === "guest") {
    return errorResponse(
      403,
      "GUEST_LOCAL_SAVE_ONLY",
      "Guest游戏进度仅保存在本地；绑定SF Account后才会启用云存档"
    );
  }

  if (
    request.method !== "GET" &&
    Number(session.user.pending_delete) === 1
  ) {
    return errorResponse(
      403,
      "ACCOUNT_PENDING_DELETION",
      "账号处于注销期，无法保存游戏"
    );
  }

  if (request.method === "GET") {
    const requestedGameId = String(
      url.searchParams.get("gameId") || ""
    ).trim();

    if (requestedGameId) {
      const save = await env.DB.prepare(
        `SELECT
          game_id,
          save_data,
          save_schema_version,
          updated_at
        FROM sf_saves_v2
        WHERE user_id = ?
          AND game_id = ?
        LIMIT 1`
      ).bind(userId, requestedGameId).first();

      if (!save) {
        return jsonResponse({
          success: true,
          save: null,
          gameId: requestedGameId
        });
      }

      return jsonResponse({
        success: true,
        save: formatSave(save)
      });
    }

    const result = await env.DB.prepare(
      `SELECT
        game_id,
        save_data,
        save_schema_version,
        updated_at
      FROM sf_saves_v2
      WHERE user_id = ?
      ORDER BY updated_at DESC`
    ).bind(userId).all();

    return jsonResponse({
      success: true,
      saves: (result.results || []).map(formatSave)
    });
  }

  const body = await readJson(request);

  const gameId = String(
    body.gameId ||
    body.game_id ||
    "project-zero"
  ).trim();

  const schemaVersion = normalizeSchemaVersion(
    body.saveSchemaVersion ??
    body.schemaVersion ??
    body.version ??
    1
  );

  const suppliedSaveData =
    body.saveData !== undefined
      ? body.saveData
      : body.data !== undefined
        ? body.data
        : body.save !== undefined
          ? body.save
          : body.payload;

  if (!gameId) {
    return errorResponse(
      400,
      "GAME_ID_REQUIRED",
      "缺少 gameId"
    );
  }

  if (suppliedSaveData === undefined) {
    return errorResponse(
      400,
      "SAVE_DATA_REQUIRED",
      "缺少存档数据"
    );
  }

  let saveJson;

  try {
    saveJson = JSON.stringify(suppliedSaveData);
  } catch {
    return errorResponse(
      400,
      "INVALID_SAVE_DATA",
      "存档数据无法转换为JSON"
    );
  }

  if (saveJson.length > 5 * 1024 * 1024) {
    return errorResponse(
      413,
      "SAVE_TOO_LARGE",
      "存档数据不能超过5MB"
    );
  }

  const now = unixTime();

  await env.DB.prepare(
    `INSERT INTO sf_saves_v2 (
      user_id,
      game_id,
      save_data,
      save_schema_version,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, game_id) DO UPDATE SET
      save_data = excluded.save_data,
      save_schema_version = excluded.save_schema_version,
      updated_at = excluded.updated_at`
  ).bind(
    userId,
    gameId,
    saveJson,
    schemaVersion,
    now
  ).run();

  return jsonResponse({
    success: true,
    message:
      request.method === "PUT"
        ? "存档已覆盖"
        : "存档已保存",
    save: {
      gameId,
      saveData: suppliedSaveData,
      saveSchemaVersion: schemaVersion,
      updatedAt: now
    }
  });
}

function crystalWarRoomCode() {
  return randomToken(8).replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
}

async function crystalWarMembership(db, userId) {
  return await db.prepare(
    `SELECT r.*, m.ready, m.contributed_kills, m.contributed_sectors,
            m.contributed_resources, m.heartbeat_at, m.joined_at
     FROM pz_cw_room_members_v1 m
     JOIN pz_cw_rooms_v1 r ON r.id = m.room_id
     WHERE m.user_id = ? AND r.expires_at > ?
     ORDER BY m.joined_at DESC LIMIT 1`
  ).bind(userId, unixTime()).first();
}

async function buildCrystalWarRoom(db, roomId, viewerId) {
  const room = await db.prepare(
    `SELECT * FROM pz_cw_rooms_v1 WHERE id = ? LIMIT 1`
  ).bind(roomId).first();
  if (!room) return null;
  const members = await db.prepare(
    `SELECT user_id, ready, contributed_kills, contributed_sectors,
            contributed_resources, heartbeat_at, joined_at
     FROM pz_cw_room_members_v1
     WHERE room_id = ? ORDER BY joined_at ASC`
  ).bind(roomId).all();
  const rows = members.results || [];
  const profiles = await loadFriendProfilesByIds(db, rows.map(row => row.user_id));
  const profileMap = new Map(profiles.map(profile => [profile.accountId, profile]));
  let claimed = [];
  try { claimed = JSON.parse(room.reward_claimed_json || "[]"); } catch (_) { claimed = []; }
  return {
    id: String(room.id), code: String(room.room_code),
    hostId: String(room.host_id), status: String(room.status),
    targetKills: Number(room.target_kills || 120),
    sharedKills: Number(room.shared_kills || 0),
    sharedSectors: Number(room.shared_sectors || 0),
    rewardClaimed: claimed.includes(String(viewerId)),
    expiresAt: Number(room.expires_at || 0),
    members: rows.map(row => ({
      ...(profileMap.get(String(row.user_id)) || {accountId:String(row.user_id), displayName:"PLAYER"}),
      ready: Number(row.ready) === 1,
      contributedKills: Number(row.contributed_kills || 0),
      contributedSectors: Number(row.contributed_sectors || 0),
      contributedResources: Number(row.contributed_resources || 0),
      online: Number(row.heartbeat_at || 0) >= unixTime() - 20,
      joinedAt: Number(row.joined_at || 0)
    }))
  };
}

async function getCrystalWarRoom(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  const membership = await crystalWarMembership(env.DB, session.user.id);
  if (!membership) return jsonResponse({success:true, room:null});
  await env.DB.prepare(
    `UPDATE pz_cw_room_members_v1 SET heartbeat_at = ? WHERE room_id = ? AND user_id = ?`
  ).bind(unixTime(), membership.id, session.user.id).run();
  return jsonResponse({success:true, room:await buildCrystalWarRoom(env.DB, membership.id, session.user.id)});
}

async function createCrystalWarRoom(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  const previous = await crystalWarMembership(env.DB, session.user.id);
  if (previous) return jsonResponse({success:true, room:await buildCrystalWarRoom(env.DB, previous.id, session.user.id)});
  const now = unixTime(), roomId = crypto.randomUUID();
  let code = crystalWarRoomCode();
  for (let i=0;i<5;i++) {
    const used = await env.DB.prepare(`SELECT 1 AS found FROM pz_cw_rooms_v1 WHERE room_code = ?`).bind(code).first();
    if (!used) break;
    code = crystalWarRoomCode();
  }
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO pz_cw_rooms_v1 (id, room_code, host_id, status, target_kills,
       shared_kills, shared_sectors, reward_claimed_json, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, 'waiting', 120, 0, 0, '[]', ?, ?, ?)`
    ).bind(roomId, code, session.user.id, now, now, now + 6 * 60 * 60),
    env.DB.prepare(
      `INSERT INTO pz_cw_room_members_v1 (room_id, user_id, ready, contributed_kills,
       contributed_sectors, contributed_resources, heartbeat_at, joined_at)
       VALUES (?, ?, 0, 0, 0, 0, ?, ?)`
    ).bind(roomId, session.user.id, now, now)
  ]);
  return jsonResponse({success:true, room:await buildCrystalWarRoom(env.DB, roomId, session.user.id)}, 201);
}

async function joinCrystalWarRoom(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  const body = await readJson(request), code = String(body.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) return errorResponse(400, "INVALID_ROOM_CODE", "房间邀请码格式无效");
  const previous = await crystalWarMembership(env.DB, session.user.id);
  if (previous) return jsonResponse({success:true, room:await buildCrystalWarRoom(env.DB, previous.id, session.user.id)});
  const room = await env.DB.prepare(
    `SELECT * FROM pz_cw_rooms_v1 WHERE room_code = ? AND status = 'waiting' AND expires_at > ? LIMIT 1`
  ).bind(code, unixTime()).first();
  if (!room) return errorResponse(404, "ROOM_NOT_FOUND", "房间不存在、已开始或已经过期");
  if (await isBlockedBetween(env.DB, session.user.id, room.host_id)) return errorResponse(403, "ROOM_BLOCKED", "双方存在黑名单关系，无法加入房间");
  const now = unixTime();
  const inserted = await env.DB.prepare(
    `INSERT INTO pz_cw_room_members_v1 (room_id, user_id, ready, contributed_kills,
     contributed_sectors, contributed_resources, heartbeat_at, joined_at)
     SELECT ?, ?, 0, 0, 0, 0, ?, ?
     WHERE (SELECT COUNT(*) FROM pz_cw_room_members_v1 WHERE room_id = ?) < 3`
  ).bind(room.id, session.user.id, now, now, room.id).run();
  if (!inserted.meta || Number(inserted.meta.changes || 0) < 1) return errorResponse(409, "ROOM_FULL", "房间人数已满");
  return jsonResponse({success:true, room:await buildCrystalWarRoom(env.DB, room.id, session.user.id)});
}

async function readyCrystalWarRoom(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  const body = await readJson(request), ready = body.ready !== false;
  const membership = await crystalWarMembership(env.DB, session.user.id);
  if (!membership) return errorResponse(404, "ROOM_REQUIRED", "当前未加入联机房间");
  const now = unixTime();
  await env.DB.prepare(
    `UPDATE pz_cw_room_members_v1 SET ready = ?, heartbeat_at = ? WHERE room_id = ? AND user_id = ?`
  ).bind(ready ? 1 : 0, now, membership.id, session.user.id).run();
  const counts = await env.DB.prepare(
    `SELECT COUNT(*) AS members, SUM(ready) AS ready_count FROM pz_cw_room_members_v1 WHERE room_id = ?`
  ).bind(membership.id).first();
  if (Number(counts?.members || 0) === 2 && Number(counts?.ready_count || 0) === 2) {
    await env.DB.prepare(
      `UPDATE pz_cw_rooms_v1 SET status = 'active', updated_at = ?, expires_at = ? WHERE id = ? AND status = 'waiting'`
    ).bind(now, now + 6 * 60 * 60, membership.id).run();
  }
  return jsonResponse({success:true, room:await buildCrystalWarRoom(env.DB, membership.id, session.user.id)});
}

async function updateCrystalWarRoomProgress(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  const body = await readJson(request);
  const kills = Math.max(0, Math.min(50, Math.floor(Number(body.killsDelta) || 0)));
  const sectors = Math.max(0, Math.min(10, Math.floor(Number(body.sectorsDelta) || 0)));
  const resources = Math.max(0, Math.min(500, Math.floor(Number(body.resourcesDelta) || 0)));
  const membership = await crystalWarMembership(env.DB, session.user.id);
  if (!membership) return errorResponse(404, "ROOM_REQUIRED", "当前未加入联机房间");
  if (membership.status !== "active") return errorResponse(409, "ROOM_NOT_ACTIVE", "双方准备后才能同步联机进度");
  const now = unixTime();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE pz_cw_room_members_v1 SET contributed_kills = contributed_kills + ?,
       contributed_sectors = contributed_sectors + ?, contributed_resources = contributed_resources + ?,
       heartbeat_at = ? WHERE room_id = ? AND user_id = ?`
    ).bind(kills, sectors, resources, now, membership.id, session.user.id),
    env.DB.prepare(
      `UPDATE pz_cw_rooms_v1 SET shared_kills = MIN(target_kills, shared_kills + ?),
       shared_sectors = shared_sectors + ?, updated_at = ?, expires_at = ? WHERE id = ?`
    ).bind(kills, sectors, now, now + 6 * 60 * 60, membership.id)
  ]);
  await env.DB.prepare(
    `UPDATE pz_cw_rooms_v1 SET status = 'completed', updated_at = ?
     WHERE id = ? AND shared_kills >= target_kills`
  ).bind(now, membership.id).run();
  return jsonResponse({success:true, room:await buildCrystalWarRoom(env.DB, membership.id, session.user.id)});
}

async function claimCrystalWarRoomReward(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  const membership = await crystalWarMembership(env.DB, session.user.id);
  if (!membership) return errorResponse(404, "ROOM_REQUIRED", "当前未加入联机房间");
  if (membership.status !== "completed") return errorResponse(409, "ROOM_NOT_COMPLETE", "联合战线目标尚未完成");
  let claimed = [];
  try { claimed = JSON.parse(membership.reward_claimed_json || "[]"); } catch (_) { claimed = []; }
  if (claimed.includes(String(session.user.id))) return errorResponse(409, "REWARD_ALREADY_CLAIMED", "联机奖励已经领取");
  claimed.push(String(session.user.id));
  await env.DB.prepare(
    `UPDATE pz_cw_rooms_v1 SET reward_claimed_json = ?, updated_at = ? WHERE id = ?`
  ).bind(JSON.stringify(claimed), unixTime(), membership.id).run();
  return jsonResponse({success:true, reward:{screws:160, coins:90, rawOre:30}, room:await buildCrystalWarRoom(env.DB, membership.id, session.user.id)});
}

async function leaveCrystalWarRoom(request, env) {
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  const membership = await crystalWarMembership(env.DB, session.user.id);
  if (!membership) return jsonResponse({success:true, room:null});
  await env.DB.prepare(`DELETE FROM pz_cw_room_members_v1 WHERE room_id = ? AND user_id = ?`).bind(membership.id, session.user.id).run();
  const next = await env.DB.prepare(
    `SELECT user_id FROM pz_cw_room_members_v1 WHERE room_id = ? ORDER BY joined_at ASC LIMIT 1`
  ).bind(membership.id).first();
  if (!next) await env.DB.prepare(`DELETE FROM pz_cw_rooms_v1 WHERE id = ?`).bind(membership.id).run();
  else if (String(membership.host_id) === String(session.user.id)) await env.DB.prepare(
    `UPDATE pz_cw_rooms_v1 SET host_id = ?, status = CASE WHEN status = 'waiting' THEN 'waiting' ELSE status END, updated_at = ? WHERE id = ?`
  ).bind(next.user_id, unixTime(), membership.id).run();
  return jsonResponse({success:true, room:null});
}

function clampNumberV2(value, min, max, fallback = min) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function stableCrystalWarSeedV3(value) {
  let hash = 2166136261;
  for (const char of String(value || "PROJECT-ZERO")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) || 20260825;
}

function parseObjectV3(value) {
  try { const parsed = JSON.parse(value || "{}"); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; }
  catch (_) { return {}; }
}

function compactEnemyV3(enemy) {
  return {
    id:String(enemy?.id || "").slice(0, 48), type:String(enemy?.type || "normal").slice(0, 24),
    x:clampNumberV2(enemy?.x, 0, 1120, 700), y:clampNumberV2(enemy?.y, 80, 660, 360),
    hp:clampNumberV2(enemy?.hp, 0, 99999999, 0), maxHp:clampNumberV2(enemy?.maxHp, 1, 99999999, 1),
    alive:enemy?.alive !== false
  };
}

function compactNodeV3(node) {
  return {
    id:String(node?.id || "").slice(0, 48), resource:String(node?.resource || "rawOre").slice(0, 24),
    device:String(node?.device || "mineral").slice(0, 24), kind:String(node?.kind || "crystal").slice(0, 24),
    x:clampNumberV2(node?.x, 0, 1120, 560), y:clampNumberV2(node?.y, 80, 660, 360),
    remaining:clampNumberV2(node?.remaining, 0, 999999, 0), quality:Math.floor(clampNumberV2(node?.quality, 1, 10, 1))
  };
}

function compactMinerV3(miner) {
  return {mineId:String(miner?.mineId || "").slice(0,48),device:String(miner?.device || "mineral").slice(0,24),progress:clampNumberV2(miner?.progress,0,3,0)};
}

function mergeCrystalWarStateV3(previous, incoming, isHost, seed, enemyLevel) {
  const old = previous && typeof previous === "object" ? previous : {};
  const next = incoming && typeof incoming === "object" ? incoming : {};
  const oldArea = Math.max(1, Math.floor(Number(old.area || 1)));
  const nextArea = Math.max(1, Math.floor(clampNumberV2(next.area, 1, 9999, oldArea)));
  const area = Math.max(oldArea, nextArea);
  const areaChanged = area !== oldArea;
  const result = {seed:Number(seed), area, enemyLevel, frameAt:Date.now()};
  const oldEnemies = Array.isArray(old.enemies) ? old.enemies.slice(0, 20).map(compactEnemyV3) : [];
  const newEnemies = Array.isArray(next.enemies) ? next.enemies.slice(0, 20).map(compactEnemyV3) : [];
  if (areaChanged || !oldEnemies.length) result.enemies = newEnemies;
  else {
    const newMap = new Map(newEnemies.map(enemy => [enemy.id, enemy]));
    result.enemies = oldEnemies.map(enemy => {
      const update = newMap.get(enemy.id);
      if (!update) return enemy;
      return {
        ...enemy,
        x:isHost ? update.x : enemy.x, y:isHost ? update.y : enemy.y,
        hp:Math.min(enemy.hp, update.hp), alive:enemy.alive && update.alive && Math.min(enemy.hp, update.hp) > 0
      };
    });
  }
  const oldNodes = Array.isArray(old.nodes) ? old.nodes.slice(0, 24).map(compactNodeV3) : [];
  const newNodes = Array.isArray(next.nodes) ? next.nodes.slice(0, 24).map(compactNodeV3) : [];
  if (areaChanged || !oldNodes.length) result.nodes = newNodes;
  else {
    const newMap = new Map(newNodes.map(node => [node.id, node]));
    result.nodes = oldNodes.map(node => {
      const update = newMap.get(node.id);
      return update ? {...node, remaining:Math.min(node.remaining, update.remaining)} : node;
    });
  }
  const miners = new Map();
  for (const miner of [...(Array.isArray(old.miners)?old.miners:[]), ...(Array.isArray(next.miners)?next.miners:[])].slice(-40)) {
    const compact = compactMinerV3(miner);
    if (compact.mineId) miners.set(compact.mineId, compact);
  }
  result.miners = [...miners.values()].slice(0, 24);
  return result;
}

function mergeCrystalWarWorldV3(current, incoming) {
  const base = current && typeof current === "object" ? current : {};
  const next = incoming && typeof incoming === "object" ? incoming : {};
  const merged = {...base, ...next};
  const oldInstances = Array.isArray(base.instances) ? base.instances : [];
  const newInstances = Array.isArray(next.instances) ? next.instances : [];
  const removed = new Set(Array.isArray(next.removedInstanceIdsV3) ? next.removedInstanceIdsV3.map(String) : []);
  const instances = new Map(oldInstances.map(item => [String(item.iid), item]));
  for (const item of newInstances) if (item && item.iid != null) instances.set(String(item.iid), item);
  for (const id of removed) instances.delete(id);
  merged.instances = [...instances.values()].slice(0, 500);
  const mergeEdges = (a,b) => {
    const edges = new Map();
    for (const edge of [...(Array.isArray(a)?a:[]), ...(Array.isArray(b)?b:[])]) {
      if (!Array.isArray(edge) || edge.length < 2) continue;
      const key = String(edge[0])+">"+String(edge[1]); edges.set(key,[edge[0],edge[1]]);
    }
    return [...edges.values()].filter(edge => !removed.has(String(edge[0])) && !removed.has(String(edge[1]))).slice(0,1000);
  };
  merged.instanceLinks = mergeEdges(base.instanceLinks, next.instanceLinks);
  merged.instancePowerLinks = mergeEdges(base.instancePowerLinks, next.instancePowerLinks);
  merged.removedInstanceIdsV3 = [...new Set([...(base.removedInstanceIdsV3 || []), ...(next.removedInstanceIdsV3 || [])].map(String))].slice(-500);
  return merged;
}

function crystalWarWorldRowV2(row, includeSave = false) {
  if (!row) return null;
  const world = {
    id: String(row.id), ownerId: String(row.owner_id),
    slotIndex: Number(row.slot_index), name: String(row.world_name || "联机存档"),
    revision: Number(row.revision || 0), createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0)
  };
  if (includeSave) {
    try { world.saveData = JSON.parse(row.save_data || "{}"); }
    catch (_) { world.saveData = {}; }
  }
  return world;
}

async function crystalWarMembershipV2(db, userId) {
  return await db.prepare(
    `SELECT r.*, m.ready, m.activity AS member_activity, m.role_id, m.pos_x, m.pos_y,
            m.hp, m.area, m.emote_id, m.emote_at, m.role_level, m.heartbeat_ms, m.joined_at
     FROM pz_cw_room_members_v2 m JOIN pz_cw_rooms_v2 r ON r.id = m.room_id
     WHERE m.user_id = ? AND r.expires_at > ? ORDER BY m.joined_at DESC LIMIT 1`
  ).bind(userId, unixTime()).first();
}

async function buildCrystalWarRoomV2(db, roomId, viewerId, includeWorld = true) {
  const room = await db.prepare(`SELECT * FROM pz_cw_rooms_v2 WHERE id = ? LIMIT 1`).bind(roomId).first();
  if (!room) return null;
  const memberResult = await db.prepare(
    `SELECT user_id, ready, activity, role_id, pos_x, pos_y, hp, area,
            emote_id, emote_at, role_level, heartbeat_ms, joined_at
     FROM pz_cw_room_members_v2 WHERE room_id = ? ORDER BY joined_at ASC`
  ).bind(roomId).all();
  const rows = memberResult.results || [];
  const profiles = await loadFriendProfilesByIds(db, rows.map(row => row.user_id));
  const profileMap = new Map(profiles.map(profile => [String(profile.accountId), profile]));
  let lastEvent = null;
  try { lastEvent = JSON.parse(room.last_event_json || "{}"); } catch (_) { lastEvent = null; }
  const sharedState = parseObjectV3(room.state_json);
  const memberLevels = rows.map(row => Math.max(1, Math.floor(Number(row.role_level || 1))));
  const enemyLevel = Math.max(1, Math.round(memberLevels.reduce((sum, value) => sum + value, 0) / Math.max(1, memberLevels.length)));
  sharedState.seed = Number(sharedState.seed || room.world_seed || stableCrystalWarSeedV3(room.id));
  sharedState.enemyLevel = enemyLevel;
  const result = {
    id:String(room.id), code:String(room.room_code), hostId:String(room.host_id),
    worldId:String(room.world_id), status:String(room.status), activity:String(room.activity || "lobby"),
    maxPlayers:Math.min(CRYSTAL_WAR_MAX_PLAYERS, Number(room.max_players || CRYSTAL_WAR_MAX_PLAYERS)), playerCount:rows.length,
    expiresAt:Number(room.expires_at || 0), updatedAt:Number(room.updated_at || 0), lastEvent,
    isPrivate:Number(room.is_private || 0) === 1,
    stateRevision:Number(room.state_revision || 0), sharedState, enemyLevel,
    members:rows.map(row => ({
      ...(profileMap.get(String(row.user_id)) || {accountId:String(row.user_id), displayName:"PLAYER", avatarRole:0}),
      ready:Number(row.ready) === 1, activity:String(row.activity || "lobby"),
      roleId:Number(row.role_id || 0), x:Number(row.pos_x || 560), y:Number(row.pos_y || 400),
      hp:Number(row.hp || 0), area:Number(row.area || 1), roleLevel:Math.max(1,Number(row.role_level || 1)), emoteId:Number(row.emote_id ?? -1),
      emoteAt:Number(row.emote_at || 0), online:Number(row.heartbeat_ms || 0) >= Date.now() - 12000,
      joinedAt:Number(row.joined_at || 0)
    }))
  };
  if (includeWorld) {
    const world = await db.prepare(`SELECT * FROM pz_cw_worlds_v2 WHERE id = ? LIMIT 1`).bind(room.world_id).first();
    result.world = crystalWarWorldRowV2(world, true);
  }
  result.viewerId = String(viewerId || "");
  return result;
}

async function listCrystalWarWorldsV2(request, env) {
  const session = await authenticateFriendRequest(request, env); if (session.error) return session.error;
  const rows = await env.DB.prepare(
    `SELECT id, owner_id, slot_index, world_name, revision, created_at, updated_at
     FROM pz_cw_worlds_v2 WHERE owner_id = ? ORDER BY slot_index ASC`
  ).bind(session.user.id).all();
  return jsonResponse({success:true, maxSlots:4, worlds:(rows.results || []).map(row => crystalWarWorldRowV2(row, false))});
}

async function createCrystalWarWorldV2(request, env) {
  const session = await authenticateFriendRequest(request, env); if (session.error) return session.error;
  const body = await readJson(request), slotIndex = Math.floor(clampNumberV2(body.slotIndex, 1, 4, 1));
  const exists = await env.DB.prepare(`SELECT id FROM pz_cw_worlds_v2 WHERE owner_id = ? AND slot_index = ? LIMIT 1`).bind(session.user.id, slotIndex).first();
  if (exists) return errorResponse(409, "WORLD_SLOT_OCCUPIED", "该联机存档槽已经存在");
  const now = unixTime(), id = crypto.randomUUID();
  const name = String(body.name || `联合档案 ${slotIndex}`).trim().slice(0, 28) || `联合档案 ${slotIndex}`;
  await env.DB.prepare(
    `INSERT INTO pz_cw_worlds_v2 (id, owner_id, slot_index, world_name, save_data, revision, created_at, updated_at)
     VALUES (?, ?, ?, ?, '{}', 0, ?, ?)`
  ).bind(id, session.user.id, slotIndex, name, now, now).run();
  const row = await env.DB.prepare(`SELECT * FROM pz_cw_worlds_v2 WHERE id = ?`).bind(id).first();
  return jsonResponse({success:true, world:crystalWarWorldRowV2(row, true)}, 201);
}

async function deleteCrystalWarWorldV2(request, env, path) {
  const session = await authenticateFriendRequest(request, env); if (session.error) return session.error;
  const raw = path.slice("/api/crystal-war/v2/worlds/".length), slotIndex = Number(decodeURIComponent(raw));
  if (!Number.isInteger(slotIndex) || slotIndex < 1 || slotIndex > 4) return errorResponse(400, "INVALID_WORLD_SLOT", "联机存档槽无效");
  const result = await env.DB.prepare(`DELETE FROM pz_cw_worlds_v2 WHERE owner_id = ? AND slot_index = ?`).bind(session.user.id, slotIndex).run();
  if (!Number(result.meta?.changes || 0)) return errorResponse(404, "WORLD_NOT_FOUND", "联机存档不存在");
  return jsonResponse({success:true, deletedSlot:slotIndex});
}

async function listCrystalWarRoomsV2(request, env) {
  const session = await authenticateFriendRequest(request, env); if (session.error) return session.error;
  const rows = await env.DB.prepare(
    `SELECT r.*, w.world_name, p.display_name AS host_name,
      (SELECT COUNT(*) FROM pz_cw_room_members_v2 m WHERE m.room_id = r.id) AS player_count
     FROM pz_cw_rooms_v2 r JOIN pz_cw_worlds_v2 w ON w.id = r.world_id
     LEFT JOIN pz_public_profiles_v1 p ON p.user_id = r.host_id
     WHERE r.expires_at > ? AND r.status = 'waiting' AND COALESCE(r.is_private,0) = 0
       AND (SELECT COUNT(*) FROM pz_cw_room_members_v2 m WHERE m.room_id = r.id) < r.max_players
     ORDER BY r.updated_at DESC LIMIT 24`
  ).bind(unixTime()).all();
  const rooms = [];
  for (const row of rows.results || []) {
    if (await isBlockedBetween(env.DB, session.user.id, row.host_id)) continue;
    rooms.push({id:String(row.id), code:String(row.room_code), worldName:String(row.world_name),
      hostId:String(row.host_id), hostName:String(row.host_name || "PLAYER"), status:String(row.status),
      activity:String(row.activity || "lobby"), playerCount:Number(row.player_count || 0),
      maxPlayers:Math.min(CRYSTAL_WAR_MAX_PLAYERS, Number(row.max_players || CRYSTAL_WAR_MAX_PLAYERS)), updatedAt:Number(row.updated_at || 0)});
  }
  return jsonResponse({success:true, rooms, refreshedAt:Date.now()});
}

async function createCrystalWarRoomV2(request, env) {
  const session = await authenticateFriendRequest(request, env); if (session.error) return session.error;
  const body = await readJson(request), slotIndex = Math.floor(clampNumberV2(body.slotIndex, 1, 4, 1));
  const previous = await crystalWarMembershipV2(env.DB, session.user.id);
  if (previous) return jsonResponse({success:true, room:await buildCrystalWarRoomV2(env.DB, previous.id, session.user.id)});
  const world = await env.DB.prepare(`SELECT * FROM pz_cw_worlds_v2 WHERE owner_id = ? AND slot_index = ? LIMIT 1`).bind(session.user.id, slotIndex).first();
  if (!world) return errorResponse(404, "WORLD_NOT_FOUND", "请先创建该联机存档");
  const now = unixTime(), roomId = crypto.randomUUID(); let code = crystalWarRoomCode();
  for (let i=0;i<6;i++) { const used=await env.DB.prepare(`SELECT 1 AS found FROM pz_cw_rooms_v2 WHERE room_code = ?`).bind(code).first(); if(!used)break; code=crystalWarRoomCode(); }
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO pz_cw_rooms_v2 (id, world_id, room_code, host_id, status, activity, max_players, last_event_json, is_private, state_json, state_revision, world_seed, created_at, updated_at, expires_at)
      VALUES (?, ?, ?, ?, 'waiting', 'lobby', 3, '{}', 0, '{}', 0, ?, ?, ?, ?)`).bind(roomId, world.id, code, session.user.id, stableCrystalWarSeedV3(roomId), now, now, now+12*60*60),
    env.DB.prepare(`INSERT INTO pz_cw_room_members_v2 (room_id,user_id,ready,activity,role_id,pos_x,pos_y,hp,area,emote_id,emote_at,role_level,heartbeat_ms,joined_at)
      VALUES (?, ?, 0, 'lobby', 0, 560, 400, 100, 1, -1, 0, 1, ?, ?)`).bind(roomId, session.user.id, Date.now(), now)
  ]);
  return jsonResponse({success:true, room:await buildCrystalWarRoomV2(env.DB, roomId, session.user.id)}, 201);
}

async function getCrystalWarRoomV2(request, env) {
  const session = await authenticateFriendRequest(request, env); if (session.error) return session.error;
  const membership = await crystalWarMembershipV2(env.DB, session.user.id);
  if (!membership) return jsonResponse({success:true, room:null});
  await env.DB.prepare(`UPDATE pz_cw_room_members_v2 SET heartbeat_ms = ? WHERE room_id = ? AND user_id = ?`).bind(Date.now(), membership.id, session.user.id).run();
  const includeWorld=String(membership.status)==="active"&&new URL(request.url).searchParams.get("includeWorld")==="1";
  return jsonResponse({success:true, room:await buildCrystalWarRoomV2(env.DB, membership.id, session.user.id, includeWorld)});
}

async function joinCrystalWarRoomV2(request, env) {
  const session = await authenticateFriendRequest(request, env); if (session.error) return session.error;
  const body = await readJson(request), code = String(body.code || "").trim().toUpperCase(), roomId = String(body.roomId || "").trim();
  const previous = await crystalWarMembershipV2(env.DB, session.user.id);
  if (previous) return jsonResponse({success:true, room:await buildCrystalWarRoomV2(env.DB, previous.id, session.user.id)});
  const room = roomId
    ? await env.DB.prepare(`SELECT * FROM pz_cw_rooms_v2 WHERE id = ? AND expires_at > ? LIMIT 1`).bind(roomId, unixTime()).first()
    : await env.DB.prepare(`SELECT * FROM pz_cw_rooms_v2 WHERE room_code = ? AND expires_at > ? LIMIT 1`).bind(code, unixTime()).first();
  if (!room) return errorResponse(404, "ROOM_NOT_FOUND", "房间不存在或已经过期");
  if (String(room.status) !== "waiting") return errorResponse(409, "ROOM_ALREADY_ACTIVE", "房间已经开始行动");
  if (await isBlockedBetween(env.DB, session.user.id, room.host_id)) return errorResponse(403, "ROOM_BLOCKED", "双方存在黑名单关系，无法加入房间");
  const now=unixTime(), inserted=await env.DB.prepare(
    `INSERT INTO pz_cw_room_members_v2 (room_id,user_id,ready,activity,role_id,pos_x,pos_y,hp,area,emote_id,emote_at,role_level,heartbeat_ms,joined_at)
     SELECT ?, ?, 0, 'lobby', 0, 560, 400, 100, 1, -1, 0, 1, ?, ?
     WHERE (SELECT COUNT(*) FROM pz_cw_room_members_v2 WHERE room_id = ?) < ?`
  ).bind(room.id, session.user.id, Date.now(), now, room.id, Math.min(CRYSTAL_WAR_MAX_PLAYERS, Number(room.max_players || CRYSTAL_WAR_MAX_PLAYERS))).run();
  if (!Number(inserted.meta?.changes || 0)) return errorResponse(409, "ROOM_FULL", "房间人数已满");
  await env.DB.prepare(`UPDATE pz_cw_rooms_v2 SET status='waiting', updated_at=?, expires_at=? WHERE id=?`).bind(now,now+12*60*60,room.id).run();
  return jsonResponse({success:true, room:await buildCrystalWarRoomV2(env.DB, room.id, session.user.id)});
}

async function readyCrystalWarRoomV2(request, env) {
  const session = await authenticateFriendRequest(request, env); if (session.error) return session.error;
  const body=await readJson(request), membership=await crystalWarMembershipV2(env.DB, session.user.id);
  if(!membership)return errorResponse(404,"ROOM_REQUIRED","当前未加入联机房间");
  const ready=body.ready!==false, now=unixTime(),roleId=Math.floor(clampNumberV2(body.roleId,0,31,membership.role_id||0)),roleLevel=Math.floor(clampNumberV2(body.roleLevel,1,999,membership.role_level||1));
  await env.DB.prepare(`UPDATE pz_cw_room_members_v2 SET ready=?,role_id=?,role_level=?,heartbeat_ms=? WHERE room_id=? AND user_id=?`).bind(ready?1:0,roleId,roleLevel,Date.now(),membership.id,session.user.id).run();
  const counts=await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(ready) AS ready_count FROM pz_cw_room_members_v2 WHERE room_id=?`).bind(membership.id).first();
  if(Number(counts.total||0)>0&&Number(counts.ready_count||0)===Number(counts.total||0))await env.DB.prepare(`UPDATE pz_cw_rooms_v2 SET status='active',activity='choice',updated_at=?,expires_at=? WHERE id=?`).bind(now,now+12*60*60,membership.id).run();
  else await env.DB.prepare(`UPDATE pz_cw_rooms_v2 SET status='waiting',activity='lobby',updated_at=? WHERE id=?`).bind(now,membership.id).run();
  return jsonResponse({success:true,room:await buildCrystalWarRoomV2(env.DB,membership.id,session.user.id,true)});
}

async function updateCrystalWarPresenceV2(request, env) {
  const session=await authenticateFriendRequest(request,env);if(session.error)return session.error;
  const body=await readJson(request),membership=await crystalWarMembershipV2(env.DB,session.user.id);
  if(!membership)return errorResponse(404,"ROOM_REQUIRED","当前未加入联机房间");
  const activity=["lobby","choice","base","battle"].includes(body.activity)?body.activity:"lobby";
  const role=Math.floor(clampNumberV2(body.roleId,0,31,membership.role_id||0)),roleLevel=Math.floor(clampNumberV2(body.roleLevel,1,999,membership.role_level||1)),x=clampNumberV2(body.x,0,1120,membership.pos_x||560),y=clampNumberV2(body.y,80,660,membership.pos_y||400),hp=clampNumberV2(body.hp,0,999999,membership.hp??100),area=Math.floor(clampNumberV2(body.area,1,9999,membership.area||1));
  const hasNewEmote=Number(body.emoteId)>=0,emote=hasNewEmote?Math.floor(clampNumberV2(body.emoteId,0,5,0)):Number(membership.emote_id??-1),emoteAt=hasNewEmote?Math.max(Date.now(),Number(membership.emote_at||0)+1):Number(membership.emote_at||0),now=unixTime();
  const memberRows=await env.DB.prepare(`SELECT user_id,role_level FROM pz_cw_room_members_v2 WHERE room_id=? ORDER BY joined_at ASC`).bind(membership.id).all();
  const levels=(memberRows.results||[]).map(row=>String(row.user_id)===String(session.user.id)?roleLevel:Math.max(1,Number(row.role_level||1)));
  if(!levels.length)levels.push(roleLevel);
  const enemyLevel=Math.max(1,Math.round(levels.reduce((sum,value)=>sum+value,0)/levels.length));
  const privacyRequested=typeof body.isPrivate==="boolean"&&String(membership.host_id)===String(session.user.id);
  await env.DB.prepare(`UPDATE pz_cw_room_members_v2 SET activity=?,role_id=?,role_level=?,pos_x=?,pos_y=?,hp=?,area=?,emote_id=?,emote_at=?,heartbeat_ms=? WHERE room_id=? AND user_id=?`).bind(activity,role,roleLevel,x,y,hp,area,emote,emoteAt,Date.now(),membership.id,session.user.id).run();
  const needsSharedCommit=!!(body.sharedState&&activity==="battle")||privacyRequested;
  if(needsSharedCommit){
    let stateRow={state_json:membership.state_json,state_revision:Number(membership.state_revision||0),host_id:membership.host_id,world_seed:membership.world_seed};
    let committed=false;
    for(let attempt=0;attempt<4&&!committed;attempt++){
      const previousState=parseObjectV3(stateRow.state_json);
      const mergedState=body.sharedState&&activity==="battle"
        ? mergeCrystalWarStateV3(previousState,body.sharedState,String(stateRow.host_id)===String(session.user.id),Number(stateRow.world_seed||stableCrystalWarSeedV3(membership.id)),enemyLevel)
        : {...previousState,seed:Number(previousState.seed||stateRow.world_seed||stableCrystalWarSeedV3(membership.id)),enemyLevel};
      const expectedRevision=Number(stateRow.state_revision||0);
      const result=privacyRequested
        ? await env.DB.prepare(`UPDATE pz_cw_rooms_v2 SET activity=?,is_private=?,state_json=?,state_revision=state_revision+1,updated_at=?,expires_at=? WHERE id=? AND state_revision=?`).bind(activity,body.isPrivate?1:0,JSON.stringify(mergedState),now,now+12*60*60,membership.id,expectedRevision).run()
        : await env.DB.prepare(`UPDATE pz_cw_rooms_v2 SET activity=?,state_json=?,state_revision=state_revision+1,updated_at=?,expires_at=? WHERE id=? AND state_revision=?`).bind(activity,JSON.stringify(mergedState),now,now+12*60*60,membership.id,expectedRevision).run();
      committed=Number(result.meta?.changes||0)>0;
      if(!committed)stateRow=await env.DB.prepare(`SELECT state_json,state_revision,host_id,world_seed FROM pz_cw_rooms_v2 WHERE id=? LIMIT 1`).bind(membership.id).first()||stateRow;
    }
    if(!committed)return errorResponse(409,"ROOM_STATE_BUSY","房间状态正在同步，请稍后重试");
  }else{
    await env.DB.prepare(`UPDATE pz_cw_rooms_v2 SET activity=?,updated_at=?,expires_at=? WHERE id=?`).bind(activity,now,now+12*60*60,membership.id).run();
  }
  return jsonResponse({success:true,room:await buildCrystalWarRoomV2(env.DB,membership.id,session.user.id,false)});
}

async function saveCrystalWarWorldV2(request, env) {
  const session=await authenticateFriendRequest(request,env);if(session.error)return session.error;
  const membership=await crystalWarMembershipV2(env.DB,session.user.id);if(!membership)return errorResponse(404,"ROOM_REQUIRED","当前未加入联机房间");
  const body=await readJson(request);let json;
  const currentRow=await env.DB.prepare(`SELECT save_data FROM pz_cw_worlds_v2 WHERE id=?`).bind(membership.world_id).first();
  const current=parseObjectV3(currentRow?.save_data),merged=mergeCrystalWarWorldV3(current,body.saveData===undefined?{}:body.saveData);
  try{json=JSON.stringify(merged);}catch(_){return errorResponse(400,"INVALID_WORLD_SAVE","联机存档无法转换为JSON");}
  if(json.length>5*1024*1024)return errorResponse(413,"WORLD_SAVE_TOO_LARGE","联机存档不能超过5MB");
  const now=unixTime();await env.DB.prepare(`UPDATE pz_cw_worlds_v2 SET save_data=?,revision=revision+1,updated_at=? WHERE id=?`).bind(json,now,membership.world_id).run();
  const world=await env.DB.prepare(`SELECT * FROM pz_cw_worlds_v2 WHERE id=?`).bind(membership.world_id).first();
  return jsonResponse({success:true,world:crystalWarWorldRowV2(world,true)});
}

async function leaveCrystalWarRoomV2(request, env) {
  const session=await authenticateFriendRequest(request,env);if(session.error)return session.error;
  const membership=await crystalWarMembershipV2(env.DB,session.user.id);if(!membership)return jsonResponse({success:true,room:null});
  const profile=(await loadFriendProfilesByIds(env.DB,[session.user.id]))[0]||{};
  const event=JSON.stringify({type:"leave",accountId:String(session.user.id),displayName:String(profile.displayName||session.user.username||"PLAYER"),at:Date.now()});
  await env.DB.batch([
    env.DB.prepare(`UPDATE pz_cw_rooms_v2 SET last_event_json=?,updated_at=? WHERE id=?`).bind(event,unixTime(),membership.id),
    env.DB.prepare(`DELETE FROM pz_cw_room_members_v2 WHERE room_id=? AND user_id=?`).bind(membership.id,session.user.id)
  ]);
  const next=await env.DB.prepare(`SELECT user_id FROM pz_cw_room_members_v2 WHERE room_id=? ORDER BY joined_at ASC LIMIT 1`).bind(membership.id).first();
  if(!next)await env.DB.prepare(`DELETE FROM pz_cw_rooms_v2 WHERE id=?`).bind(membership.id).run();
  else if(String(membership.host_id)===String(session.user.id))await env.DB.prepare(`UPDATE pz_cw_rooms_v2 SET host_id=?,status='waiting',activity='lobby' WHERE id=?`).bind(next.user_id,membership.id).run();
  return jsonResponse({success:true,room:null});
}

async function authenticate(request, db, expectedType) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      error: errorResponse(
        401,
        "AUTHENTICATION_REQUIRED",
        "请先登录"
      )
    };
  }

  const tokenHash = await sha256(token);
  const now = unixTime();

  const user = await db.prepare(
    `SELECT
      u.id,
      u.username,
      u.email,
      u.created_at,
      u.account_type,
      u.pending_delete,
      u.delete_at,
      s.expires_at,
      s.token_type
    FROM sf_sessions_v2 s
    JOIN sf_users_v2 u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.token_type = ?
    LIMIT 1`
  ).bind(tokenHash, expectedType).first();

  if (!user) {
    return {
      error: errorResponse(
        401,
        "INVALID_SESSION",
        "登录状态无效，请重新登录"
      )
    };
  }

  if (Number(user.expires_at) <= now) {
    await db.prepare(
      `DELETE FROM sf_sessions_v2
       WHERE token_hash = ?`
    ).bind(tokenHash).run();

    return {
      error: errorResponse(
        401,
        "SESSION_EXPIRED",
        "登录状态已经过期，请重新登录"
      )
    };
  }

  return {
    user
  };
}

async function createTokenPair(db, userId) {
  const accessToken = randomToken(32);
  const refreshToken = randomToken(48);

  const accessHash = await sha256(accessToken);
  const refreshHash = await sha256(refreshToken);

  const now = unixTime();
  const accessExpiresAt = now + ACCESS_TOKEN_SECONDS;
  const refreshExpiresAt = now + REFRESH_TOKEN_SECONDS;

  await db.prepare(
    `INSERT INTO sf_sessions_v2 (
      token_hash,
      user_id,
      token_type,
      expires_at,
      created_at
    )
    VALUES (?, ?, 'access', ?, ?)`
  ).bind(
    accessHash,
    userId,
    accessExpiresAt,
    now
  ).run();

  await db.prepare(
    `INSERT INTO sf_sessions_v2 (
      token_hash,
      user_id,
      token_type,
      expires_at,
      created_at
    )
    VALUES (?, ?, 'refresh', ?, ?)`
  ).bind(
    refreshHash,
    userId,
    refreshExpiresAt,
    now
  ).run();

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_SECONDS,
    accessTokenExpiresAt: accessExpiresAt,
    refreshTokenExpiresAt: refreshExpiresAt
  };
}

async function generateAvailableUsername(db, email) {
  let base = String(email.split("@")[0] || "player")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 20);

  if (base.length < 3) {
    base = "player";
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = randomDigits(6);
    const candidate = `${base}_${suffix}`.slice(0, 32);

    const existing = await db.prepare(
      `SELECT id
       FROM sf_users_v2
       WHERE username = ?
       LIMIT 1`
    ).bind(candidate).first();

    if (!existing) {
      return candidate;
    }
  }

  return `player_${randomToken(8)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 12)}`;
}

async function hashPassword(password, saltHex) {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(saltHex),
      iterations: PBKDF2_ITERATIONS
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return bytesToHex(new Uint8Array(hash));
}

function generateSixDigitCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);

  return String(values[0] % 1000000).padStart(6, "0");
}

function randomDigits(length) {
  let output = "";

  while (output.length < length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      output += String(byte % 10);

      if (output.length >= length) {
        break;
      }
    }
  }

  return output;
}

function randomToken(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return bytesToBase64Url(bytes);
}

function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return bytesToHex(bytes);
}

function bytesToBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  if (
    typeof hex !== "string" ||
    hex.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(hex)
  ) {
    throw new Error("密码盐格式无效");
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(
      hex.slice(i * 2, i * 2 + 2),
      16
    );
  }

  return bytes;
}

function formatSave(row) {
  let saveData = null;

  try {
    saveData = JSON.parse(row.save_data);
  } catch {
    saveData = row.save_data;
  }

  return {
    gameId: row.game_id,
    saveData,
    saveSchemaVersion: Number(
      row.save_schema_version || 1
    ),
    updatedAt: Number(row.updated_at)
  };
}

function publicUser(user) {
  const accountType = String(user.account_type || "sf");
  return {
    id: user.id,
    username: user.username,
    email: accountType === "guest" ? "" : user.email,
    createdAt: Number(user.created_at || 0),
    accountType,
    isGuest: accountType === "guest"
  };
}

function getBearerToken(request) {
  const authorization =
    request.headers.get("Authorization") || "";

  const match = authorization.match(
    /^Bearer\s+(.+)$/i
  );

  return match ? match[1].trim() : "";
}

async function readJson(request) {
  const contentType =
    request.headers.get("Content-Type") || "";

  if (
    contentType &&
    !contentType.toLowerCase().includes("application/json")
  ) {
    throw new HttpError(
      415,
      "CONTENT_TYPE_REQUIRED",
      "请求必须使用 application/json"
    );
  }

  try {
    const body = await request.json();

    if (
      body === null ||
      Array.isArray(body) ||
      typeof body !== "object"
    ) {
      throw new Error("Body must be an object");
    }

    return body;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(
      400,
      "INVALID_JSON",
      "请求JSON格式无效"
    );
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return (
    email.length >= 5 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 128
  );
}

function normalizeSchemaVersion(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, 2147483647);
}

async function createCrystalWarRealtimeTicketV3(request, env) {
  if (!env.CRYSTAL_WAR_ROOMS) return errorResponse(503, "REALTIME_BINDING_REQUIRED", "缺少 CRYSTAL_WAR_ROOMS Durable Object 绑定");
  const session = await authenticateFriendRequest(request, env);
  if (session.error) return session.error;
  const membership = await crystalWarMembershipV2(env.DB, session.user.id);
  if (!membership) return errorResponse(404, "ROOM_REQUIRED", "当前未加入联机房间");
  const ticket = randomToken(32), ticketHash = await sha256(ticket), now = unixTime();
  await env.DB.prepare(
    `INSERT INTO pz_cw_realtime_tickets_v3 (ticket_hash,room_id,user_id,expires_at,created_at) VALUES (?,?,?,?,?)`
  ).bind(ticketHash, membership.id, session.user.id, now + CRYSTAL_WAR_TICKET_SECONDS, now).run();
  const url = new URL(request.url);
  url.pathname = "/api/crystal-war/v3/realtime";
  url.search = "?ticket=" + encodeURIComponent(ticket);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return jsonResponse({success:true, url:url.toString(), expiresIn:CRYSTAL_WAR_TICKET_SECONDS, tickRate:20, maxPlayers:CRYSTAL_WAR_MAX_PLAYERS});
}

async function connectCrystalWarRealtimeV3(request, env, url) {
  if (!env.CRYSTAL_WAR_ROOMS) return errorResponse(503, "REALTIME_BINDING_REQUIRED", "缺少 CRYSTAL_WAR_ROOMS Durable Object 绑定");
  if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return errorResponse(426, "WEBSOCKET_REQUIRED", "该接口需要 WebSocket");
  const ticket = String(url.searchParams.get("ticket") || "");
  if (!ticket) return errorResponse(401, "REALTIME_TICKET_REQUIRED", "缺少联机凭证");
  const hash = await sha256(ticket), now = unixTime();
  const row = await env.DB.prepare(
    `SELECT t.room_id,t.user_id,r.world_seed,r.host_id,m.role_id,m.role_level,p.display_name,p.avatar_role
     FROM pz_cw_realtime_tickets_v3 t
     JOIN pz_cw_rooms_v2 r ON r.id=t.room_id
     JOIN pz_cw_room_members_v2 m ON m.room_id=t.room_id AND m.user_id=t.user_id
     LEFT JOIN pz_public_profiles_v1 p ON p.user_id=t.user_id
     WHERE t.ticket_hash=? AND t.expires_at>? LIMIT 1`
  ).bind(hash, now).first();
  await env.DB.prepare(`DELETE FROM pz_cw_realtime_tickets_v3 WHERE ticket_hash=?`).bind(hash).run();
  if (!row) return errorResponse(401, "INVALID_REALTIME_TICKET", "联机凭证无效或已过期");
  const id = env.CRYSTAL_WAR_ROOMS.idFromName(String(row.room_id));
  const headers = new Headers(request.headers);
  headers.set("x-pz-room-id", String(row.room_id));
  headers.set("x-pz-user-id", String(row.user_id));
  headers.set("x-pz-host", String(row.host_id) === String(row.user_id) ? "1" : "0");
  headers.set("x-pz-seed", String(row.world_seed || stableCrystalWarSeedV3(row.room_id)));
  headers.set("x-pz-role", String(row.role_id || 0));
  headers.set("x-pz-level", String(row.role_level || 1));
  headers.set("x-pz-name", encodeURIComponent(String(row.display_name || "PLAYER").slice(0,32)));
  return env.CRYSTAL_WAR_ROOMS.get(id).fetch(new Request("https://room.internal/connect", {method:"GET",headers}));
}

export class PZCrystalWarRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.clients = new Map();
    this.world = {seed:0,area:1,route:"center",routeRevision:0,routeStates:{},levelClaims:{},players:{},enemies:{},resources:{},devices:{},links:{},drops:{},events:[],lobbyBall:{x:560,y:330,vx:0,vy:0,lastKickAt:0,lastKicker:""},tick:0,roomTime:0};
    this.interval = null;
    this.lastTickAt = Date.now();
    this.ready = state.blockConcurrencyWhile(async () => {
      const saved = await state.storage.get("world");
      if (saved && typeof saved === "object") this.world = {...this.world,...saved,route:String(saved.route||"center"),routeRevision:Number(saved.routeRevision||0),routeStates:saved.routeStates||{},levelClaims:saved.levelClaims&&typeof saved.levelClaims==="object"?saved.levelClaims:{},players:saved.players||{},enemies:saved.enemies||{},resources:saved.resources||{},devices:saved.devices||{},links:saved.links||{},drops:saved.drops||{},events:Array.isArray(saved.events)?saved.events:[],lobbyBall:{x:560,y:330,vx:0,vy:0,lastKickAt:0,lastKicker:"",...(saved.lobbyBall||{})}};
    });
  }

  async fetch(request) {
    await this.ready;
    if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return new Response("WebSocket required", {status:426});
    const userId = request.headers.get("x-pz-user-id") || "";
    if (!userId) return new Response("Missing player", {status:401});
    if (!this.clients.has(userId) && this.clients.size >= CRYSTAL_WAR_MAX_PLAYERS) return new Response("Room full", {status:409});
    const previousClient=this.clients.get(userId);if(previousClient)try{previousClient.socket.close(1012,"reconnected");}catch(_){}
    const pair = new WebSocketPair(), client = pair[0], server = pair[1];
    server.accept();
    const meta = {userId,host:request.headers.get("x-pz-host")==="1",name:decodeURIComponent(request.headers.get("x-pz-name")||"PLAYER"),roleId:Number(request.headers.get("x-pz-role")||0),roleLevel:Number(request.headers.get("x-pz-level")||1),lastActionSequence:0,lastHitSequence:0,lastWorldSequence:0,rateAt:Date.now(),rateCount:0};
    this.clients.set(userId,{socket:server,meta});
    if (!this.world.seed) this.world.seed = Number(request.headers.get("x-pz-seed")||0);
    const old = this.world.players[userId] || {};
    this.world.players[userId] = {...old,id:userId,name:meta.name,roleId:meta.roleId,roleLevel:meta.roleLevel,maxHp:Math.max(1,Number(old.maxHp)||100),defense:Math.max(0,Number(old.defense)||0),damageReduction:Math.max(0,Math.min(.5,Number(old.damageReduction)||0)),x:Number.isFinite(Number(old.x))?Number(old.x):560,y:Number.isFinite(Number(old.y))?Number(old.y):400,hp:Number.isFinite(Number(old.hp))?Number(old.hp):100,healthRevision:Math.max(0,Number(old.healthRevision)||0),area:Number(this.world.area||1),route:String(this.world.route||"center"),activity:"choice",moveX:0,moveY:0,vx:0,vy:0,lastInputAt:Date.now(),lastEnemyHitAt:0,recentEnemyHits:0,direction:Number(old.direction||1),lastProcessedSequence:Number(old.lastProcessedSequence||0),lastRouteSequence:Number(old.lastRouteSequence||0),connected:true};
    server.addEventListener("message", e => this.onMessage(userId,e.data));
    server.addEventListener("close", () => this.disconnect(userId,server));
    server.addEventListener("error", () => this.disconnect(userId,server));
    this.send(server,{type:"welcome",serverTime:Date.now(),tickRate:20,maxPlayers:CRYSTAL_WAR_MAX_PLAYERS,playerId:userId,world:this.fullState()});
    this.broadcast({type:"player_joined",serverTime:Date.now(),player:this.publicPlayer(this.world.players[userId])},userId);
    this.startTick();
    return new Response(null,{status:101,webSocket:client});
  }

  startTick(){ if(this.interval)return; this.lastTickAt=Date.now(); this.interval=setInterval(()=>this.tick(),50); }
  stopTick(){ if(this.interval){clearInterval(this.interval);this.interval=null;} }
  publicPlayer(p){return {id:p.id,name:p.name,roleId:p.roleId,roleLevel:p.roleLevel,x:p.x,y:p.y,vx:Number(p.vx||0),vy:Number(p.vy||0),hp:p.hp,hpRatio:Math.max(0,Math.min(1,Number(p.hp||0)/100)),healthRevision:Math.max(0,Number(p.healthRevision)||0),area:p.area,route:String(p.route||this.world.route||"center"),activity:String(p.activity||"choice"),direction:p.direction,lastProcessedSequence:p.lastProcessedSequence,connected:p.connected!==false};}
  fullState(){return {seed:this.world.seed,area:this.world.area,route:String(this.world.route||"center"),routeRevision:Number(this.world.routeRevision||0),tick:this.world.tick,roomTime:this.world.roomTime,levelClaims:{...(this.world.levelClaims||{})},lobbyBall:{...this.world.lobbyBall},players:Object.values(this.world.players).map(p=>this.publicPlayer(p)),enemies:Object.values(this.world.enemies),resources:Object.values(this.world.resources),devices:Object.values(this.world.devices),links:Object.values(this.world.links),drops:Object.values(this.world.drops)};}
  send(socket,data){try{socket.send(JSON.stringify(data));}catch(_){}}
  broadcast(data,except=""){for(const [id,c] of this.clients)if(id!==except)this.send(c.socket,data);}
  acceptRate(client){const at=Date.now();if(at-client.meta.rateAt>1000){client.meta.rateAt=at;client.meta.rateCount=0;}return ++client.meta.rateCount<=100;}
  seenEvent(eventId){if(!eventId)return false;if(this.world.events.includes(eventId))return true;this.world.events.push(eventId);if(this.world.events.length>512)this.world.events.splice(0,256);return false;}

  onMessage(userId, raw){
    const client=this.clients.get(userId);if(!client||!this.acceptRate(client))return;
    let m;try{m=JSON.parse(String(raw));}catch(_){return;}
    const p=this.world.players[userId];if(!p)return;
    if(m.type==="ping"){this.send(client.socket,{type:"pong",clientTime:Number(m.clientTime||0),serverTime:Date.now(),roomTime:this.world.roomTime});return;}
    if(m.type==="scene"){
      const previousActivity=String(p.activity||"choice"),activity=["choice","battle","base","lobby"].includes(String(m.activity))?String(m.activity):"choice";
      p.activity=activity;p.moveX=0;p.moveY=0;p.vx=0;p.vy=0;
      if(activity==="battle"){p.area=this.world.area;p.route=String(this.world.route||"center");}
      if(activity==="lobby"&&previousActivity!=="lobby"){
        const alreadyInside=p.x>=92&&p.x<=1028&&p.y>=145&&p.y<=570;
        if(!alreadyInside){const lobbyPlayers=Object.values(this.world.players).filter(player=>player.connected!==false&&player.id!==p.id&&player.activity==="lobby");const spots=[{x:430,y:450},{x:560,y:450},{x:690,y:450}],spot=spots[Math.min(lobbyPlayers.length,spots.length-1)];p.x=spot.x;p.y=spot.y;}
        p.hp=Math.max(1,Number(p.hp)||100);
      }
      this.broadcast({type:"player_scene",serverTime:Date.now(),player:this.publicPlayer(p)});return;
    }
    if(m.type==="lobby_input"){
      const seq=Math.floor(Number(m.sequence||0));if(p.activity!=="lobby"||seq<=p.lastProcessedSequence)return;
      const roleId=Number(m.roleId),roleLevel=Number(m.roleLevel);p.lastProcessedSequence=seq;p.lastInputAt=Date.now();p.moveX=Math.max(-1,Math.min(1,Number(m.moveX)||0));p.moveY=Math.max(-1,Math.min(1,Number(m.moveY)||0));p.direction=Number(m.direction)<0?-1:1;if(Number.isFinite(roleId))p.roleId=Math.max(0,Math.min(5,Math.floor(roleId)));if(Number.isFinite(roleLevel))p.roleLevel=Math.max(1,Math.min(100,Math.floor(roleLevel)));return;
    }
    if(m.type==="input"){
      const seq=Math.floor(Number(m.sequence||0));if(seq<=p.lastProcessedSequence)return;
      const roleId=Number(m.roleId),roleLevel=Number(m.roleLevel),maxHp=Number(m.maxHp),defense=Number(m.defense),damageReduction=Number(m.damageReduction);
      p.lastProcessedSequence=seq;p.lastInputAt=Date.now();p.moveX=p.activity==="battle"?Math.max(-1,Math.min(1,Number(m.moveX)||0)):0;p.moveY=p.activity==="battle"?Math.max(-1,Math.min(1,Number(m.moveY)||0)):0;p.direction=Number(m.direction)<0?-1:1;if(Number.isFinite(roleId))p.roleId=Math.max(0,Math.min(5,Math.floor(roleId)));if(Number.isFinite(roleLevel))p.roleLevel=Math.max(1,Math.min(100,Math.floor(roleLevel)));if(Number.isFinite(maxHp))p.maxHp=Math.max(100,Math.min(25000,maxHp));if(Number.isFinite(defense))p.defense=Math.max(0,Math.min(5000,defense));if(Number.isFinite(damageReduction))p.damageReduction=Math.max(0,Math.min(.5,damageReduction));p.area=this.world.area;p.route=String(this.world.route||"center");return;
    }
    if(m.type==="route_request"){this.handleRouteRequest(userId,m);return;}
    const currentAreaCleared=Object.values(this.world.enemies).length>0&&Object.values(this.world.enemies).every(enemy=>!enemy.alive);
    if(m.type==="initialize"&&(!Object.keys(this.world.enemies).length||currentAreaCleared)&&Number(m.area)===this.world.area&&String(m.route||"center")===String(this.world.route||"center")){
      this.world.enemies={};this.world.resources={};
      for(const [id,device] of Object.entries(this.world.devices))if(device.scope!=="base")delete this.world.devices[id];
      let enemyIndex=0;for(const e of Array.isArray(m.enemies)?m.enemies.slice(0,32):[]){const id=String(e.id||"").slice(0,48);if(id)this.world.enemies[id]={id,type:String(e.type||"normal"),x:Number(e.x)||700,y:Number(e.y)||360,hp:Math.max(0,Number(e.hp)||1),maxHp:Math.max(1,Number(e.maxHp)||1),alive:e.alive!==false,vx:0,vy:0,state:"idle",attackAt:Date.now()+180+(enemyIndex++%6)*120};}
      for(const n of Array.isArray(m.resources)?m.resources.slice(0,64):[]){const id=String(n.id||"").slice(0,48);if(id)this.world.resources[id]={...n,id,remaining:Math.max(0,Number(n.remaining)||0)};}
      for(const d of Array.isArray(m.devices)?m.devices.slice(0,64):[]){const id=String(d.mineId||d.id||"").slice(0,48);if(id)this.world.devices[id]={...d,id,mineId:id,scope:"field",ownerId:String(d.ownerId||userId)};}
      this.broadcast({type:"world_initialized",serverTime:Date.now(),world:this.fullState()});return;
    }
    if(m.type==="action")this.handleAction(userId,m);
    else if(m.type==="hit")this.handleHit(userId,m);
    else if(m.type==="event")this.handleWorldEvent(userId,m);
  }

  routeKey(area=this.world.area,route=this.world.route){return String(Math.max(1,Math.floor(Number(area)||1)))+":"+String(route||"center");}
  captureRoute(){this.world.routeStates[this.routeKey()]={enemies:structuredClone(this.world.enemies),resources:structuredClone(this.world.resources),devices:structuredClone(Object.fromEntries(Object.entries(this.world.devices).filter(([,d])=>d.scope!=="base"))),drops:structuredClone(this.world.drops)};}
  handleRouteRequest(userId,m){
    const p=this.world.players[userId],sequence=Math.floor(Number(m.sequence||0));if(!p||p.activity!=="battle"||sequence<=Number(p.lastRouteSequence||0))return;p.lastRouteSequence=sequence;
    const fromArea=Math.max(1,Math.floor(Number(this.world.area)||1)),fromRoute=String(this.world.route||"center"),targetArea=Math.max(1,Math.floor(Number(m.area)||fromArea)),targetRoute=["center","upper","lower"].includes(String(m.route))?String(m.route):"center";
    const cleared=Object.values(this.world.enemies).length===0||Object.values(this.world.enemies).every(e=>!e.alive);
    const validSide=fromRoute==="center"&&targetArea===fromArea&&["upper","lower"].includes(targetRoute)&&cleared;
    const validReturn=["upper","lower"].includes(fromRoute)&&targetRoute==="center"&&targetArea===fromArea;
    const validNext=fromRoute==="center"&&targetRoute==="center"&&targetArea===fromArea+1&&cleared;
    if(!validSide&&!validReturn&&!validNext)return;
    this.captureRoute();const restored=this.world.routeStates[this.routeKey(targetArea,targetRoute)]||null;
    this.world.area=targetArea;this.world.route=targetRoute;this.world.routeRevision=Number(this.world.routeRevision||0)+1;
    this.world.enemies=restored?structuredClone(restored.enemies||{}):{};this.world.resources=restored?structuredClone(restored.resources||{}):{};this.world.drops=restored?structuredClone(restored.drops||{}):{};let restoredEnemyIndex=0;for(const enemy of Object.values(this.world.enemies))if(enemy.alive)enemy.attackAt=Date.now()+180+(restoredEnemyIndex++%6)*120;
    for(const [id,d] of Object.entries(this.world.devices))if(d.scope!=="base")delete this.world.devices[id];if(restored)Object.assign(this.world.devices,structuredClone(restored.devices||{}));
    const spawn=targetRoute==="upper"?{x:560,y:570}:targetRoute==="lower"?{x:560,y:145}:validReturn?{x:560,y:fromRoute==="upper"?145:570}:{x:95,y:435};
    for(const player of Object.values(this.world.players))if(player.activity==="battle"){player.area=targetArea;player.route=targetRoute;player.x=spawn.x;player.y=spawn.y;player.vx=0;player.vy=0;player.moveX=0;player.moveY=0;}
    this.broadcast({type:"route_changed",eventId:"route:"+this.world.routeRevision,serverTime:Date.now(),area:targetArea,route:targetRoute,routeRevision:this.world.routeRevision,spawn,restored:!!restored,world:this.fullState()});
  }

  handleAction(userId,m){
    const client=this.clients.get(userId),p=this.world.players[userId],sequence=Math.floor(Number(m.sequence||0));if(!client||!p||p.activity!=="battle"||p.area!==this.world.area||String(p.route||"center")!==String(this.world.route||"center")||sequence<=client.meta.lastActionSequence)return;client.meta.lastActionSequence=sequence;
    const eventId=String(m.eventId||userId+":"+sequence);if(this.seenEvent(eventId))return;
    const kind=String(m.action||"");if(!["attack","charge","skill","ultimate","ultimate_resolve","dash","switch","parry","heal"].includes(kind))return;
    const cooldown={attack:180,charge:120,skill:420,ultimate:900,ultimate_resolve:50,dash:280,switch:250,parry:250,heal:450}[kind],at=Date.now();
    p.cooldowns=p.cooldowns||{};if(Number(p.cooldowns[kind]||0)>at)return;p.cooldowns[kind]=at+cooldown;
    if(Number.isFinite(Number(m.roleId)))p.roleId=Math.max(0,Math.min(5,Math.floor(Number(m.roleId))));
    if(kind==="heal"){
      if(Math.floor(Number(m.sourceRole))!==5||p.hp<=0)return;
      const healRatio=Math.max(.1,Math.min(25,Number(m.healRatio)||0)),before=p.hp;
      p.hp=Math.min(100,Math.round((p.hp+healRatio)*10)/10);p.healthRevision=Math.max(0,Number(p.healthRevision)||0)+1;
      if(p.hp>before)this.broadcast({type:"player_healed",eventId,serverTime:at,roomTime:this.world.roomTime,playerId:userId,hp:p.hp,heal:Math.round((p.hp-before)*10)/10,healDisplay:Math.max(1,Math.min(9999,Math.round(Number(m.healDisplay)||1))),healthRevision:p.healthRevision});
      return;
    }
    if(kind==="dash"){const dx=Math.max(-1,Math.min(1,Number(m.moveX)||0)),dy=Math.max(-1,Math.min(1,Number(m.moveY)||0)),length=Math.hypot(dx,dy)||1,perfect=m.perfect===true,impulse=perfect?840:660;p.vx=Number(p.vx||0)+dx/length*impulse;p.vy=Number(p.vy||0)+dy/length*impulse;p.invulnerableUntil=at+(perfect?570:300);}
    else if(kind==="parry")p.invulnerableUntil=Math.max(Number(p.invulnerableUntil||0),at+220);
    this.broadcast({type:kind==="ultimate_resolve"?"ultimate_resolved":kind+"_started",eventId,serverTime:at,roomTime:this.world.roomTime,playerId:userId,roleId:p.roleId,direction:p.direction,x:p.x,y:p.y,targetX:Number.isFinite(Number(m.targetX))?Number(m.targetX):null,targetY:Number.isFinite(Number(m.targetY))?Number(m.targetY):null,angle:Number.isFinite(Number(m.angle))?Number(m.angle):null,length:Math.max(0,Math.min(500,Number(m.length)||0)),charged:m.charged===true,sequence:Number(m.sequence||0),combo:Math.max(1,Math.min(3,Math.floor(Number(m.combo)||1))),moveX:Math.max(-1,Math.min(1,Number(m.moveX)||0)),moveY:Math.max(-1,Math.min(1,Number(m.moveY)||0)),results:[]});
  }

  handleHit(userId,m){
    const client=this.clients.get(userId),p=this.world.players[userId],sequence=Math.floor(Number(m.sequence||0));if(!client||!p||p.activity!=="battle"||p.area!==this.world.area||String(p.route||"center")!==String(this.world.route||"center")||sequence<=client.meta.lastHitSequence)return;client.meta.lastHitSequence=sequence;
    const eventId=String(m.eventId||userId+":hit:"+sequence);if(this.seenEvent(eventId))return;
    const enemy=this.world.enemies[String(m.enemyId||"")],sourceKind=String(m.sourceKind||"basic");if(!enemy||!enemy.alive||Number(enemy.area||this.world.area)!==p.area)return;
    const distance=Math.hypot(enemy.x-p.x,enemy.y-p.y),range=sourceKind==="basic"?165:sourceKind==="skill"?360:sourceKind==="ultimate"?620:520;if(distance>range)return;
    const requested=Math.max(1,Number(m.damage)||1),ratioCap=sourceKind==="basic"?.35:sourceKind==="skill"?.55:sourceKind==="ultimate"?1:.22,damage=Math.max(1,Math.min(requested,Math.max(1,enemy.maxHp*ratioCap),250000));
    enemy.hp=Math.max(0,enemy.hp-damage);if(enemy.hp===0){enemy.alive=false;const dropId="drop:"+enemy.id+":"+this.world.tick;this.world.drops[dropId]={id:dropId,x:enemy.x,y:enemy.y,kind:"crystal",amount:1+Math.floor(p.roleLevel/10)};this.broadcast({type:"enemy_died",eventId:eventId+":death",serverTime:Date.now(),enemyId:enemy.id,playerId:userId,drop:this.world.drops[dropId]});}
    this.broadcast({type:"hit_confirmed",eventId,serverTime:Date.now(),roomTime:this.world.roomTime,playerId:userId,enemyId:enemy.id,roleId:p.roleId,sourceRole:Number.isFinite(Number(m.sourceRole))?Math.max(0,Math.min(5,Math.floor(Number(m.sourceRole)))):p.roleId,sourceKind,label:String(m.label||"").slice(0,32),damage,hp:enemy.hp,alive:enemy.alive,x:enemy.x,y:enemy.y});
  }

  handleWorldEvent(userId,m){
    const client=this.clients.get(userId),sequence=Math.floor(Number(m.sequence||0));if(!client||sequence<=client.meta.lastWorldSequence)return;client.meta.lastWorldSequence=sequence;
    const eventId=String(m.eventId||"");if(!eventId||this.seenEvent(eventId))return;const event=String(m.event||"");
    if(event==="emoji_event"){const p=this.world.players[userId];if(!p||!["battle","lobby"].includes(String(p.activity)))return;const emojiContext=p.activity==="lobby"?"lobby":"battle";this.broadcast({type:"emoji_event",eventId,serverTime:Date.now(),playerId:userId,emojiId:Math.max(0,Math.min(5,Math.floor(Number(m.emojiId)||0))),emojiContext});return;}
    if(event==="room_level_claim"){
      const p=this.world.players[userId],level=Math.max(1,Math.min(80,Math.floor(Number(m.data?.level)||0))),key=userId+":"+level;
      if(!p||p.activity!=="lobby"||!level||this.world.levelClaims?.[key])return;
      this.world.levelClaims=this.world.levelClaims||{};
      this.world.levelClaims[key]={playerId:userId,level,claimedAt:Date.now()};
      this.state.storage.put("world",this.world);
      this.broadcast({type:"room_level_reward",eventId,serverTime:Date.now(),playerId:userId,level,divisor:3});
      return;
    }
    const id=String(m.entityId||"").slice(0,48);if(!id)return;
    if(event==="resource_harvest"){
      const resource=this.world.resources[id],p=this.world.players[userId];if(!resource||resource.remaining<=0||p?.activity!=="battle")return;const amount=Math.min(resource.remaining,Math.max(1,Math.floor(1+Number(p?.roleLevel||1)/20)));resource.remaining=Math.max(0,resource.remaining-amount);this.broadcast({type:"world_event",event:"resource_collected",eventId,serverTime:Date.now(),playerId:userId,entityId:id,data:{remaining:resource.remaining,resource:resource.resource||"rawOre",amount}});return;
    }
    if(event==="device_placed")this.world.devices[id]={...(m.data||{}),id,ownerId:userId,scope:m.data?.scope==="base"?"base":"field"};
    else if(event==="device_removed"){delete this.world.devices[id];for(const [linkId,link] of Object.entries(this.world.links))if(String(link.from)===id||String(link.to)===id)delete this.world.links[linkId];}
    else if(event==="device_upgraded"&&this.world.devices[id])Object.assign(this.world.devices[id],m.data||{});
    else if(event==="drop_picked")delete this.world.drops[id];
    else if(event==="drop_spawned")this.world.drops[id]={...(m.data||{}),id};
    else if(event==="base_route_added"||event==="base_power_added")this.world.links[id]={id,event,...(m.data||{}),ownerId:userId};
    else if(event==="base_route_removed"||event==="base_power_removed")delete this.world.links[id];
    else return;
    this.broadcast({type:"world_event",event,eventId,serverTime:Date.now(),playerId:userId,entityId:id,data:m.data||{}});
  }

  enemyDamageForPlayer(enemy,player,players,at){
    const type=String(enemy.type||"normal"),isRanged=["ranged","sniper","fireCrystal","support"].includes(type);
    const base=type==="berserker"?6:isRanged?3.8:4.8;
    const activeLevels=players.map(p=>Math.max(1,Number(p.roleLevel)||1));
    const enemyLevel=Math.max(1,Math.round(activeLevels.reduce((sum,level)=>sum+level,0)/Math.max(1,activeLevels.length)));
    const roleLevel=Math.max(1,Number(player.roleLevel)||1),levelScale=Math.max(.72,Math.min(1.38,1+(enemyLevel-roleLevel)*.018));
    const defense=Math.max(0,Math.min(5000,Number(player.defense)||0));
    const defenseScale=1-Math.min(.48,defense/(defense+enemyLevel*18+260));
    const moduleScale=1-Math.max(0,Math.min(.5,Number(player.damageReduction)||0));
    if(at-Number(player.lastEnemyHitAt||0)>900)player.recentEnemyHits=0;
    const crowdIndex=Math.max(0,Math.min(3,Math.floor(Number(player.recentEnemyHits)||0))),crowdScale=[1,.72,.52,.40][crowdIndex];
    player.recentEnemyHits=crowdIndex+1;player.lastEnemyHitAt=at;
    return Math.max(.8,Math.round(base*levelScale*defenseScale*moduleScale*crowdScale*10)/10);
  }

  tick(){
    const at=Date.now(),dt=.05;this.lastTickAt=at;this.world.tick++;this.world.roomTime+=50;
    const activePlayers=Object.values(this.world.players).filter(p=>p.connected!==false&&(p.activity==="battle"||p.activity==="lobby")),battlePlayers=activePlayers.filter(p=>p.activity==="battle"),lobbyPlayers=activePlayers.filter(p=>p.activity==="lobby");
    for(const p of activePlayers){if(p.activity==="battle"&&p.hp<=0){if(p.respawnAt&&at>=p.respawnAt){p.hp=100;p.respawnAt=0;p.x=560;p.y=400;p.vx=0;p.vy=0;this.broadcast({type:"player_respawned",eventId:"respawn:"+p.id+":"+this.world.tick,serverTime:at,playerId:p.id,x:p.x,y:p.y,hp:p.hp});}continue;}if(at-Number(p.lastInputAt||0)>260){p.moveX=0;p.moveY=0;}const l=Math.hypot(p.moveX,p.moveY)||1,roleSpeeds=[3.1,3.4,2.45,3,3.05,3.15],targetSpeed=p.activity==="lobby"?245:(roleSpeeds[p.roleId]||3.05)*116.67,targetVx=p.moveX/l*targetSpeed,targetVy=p.moveY/l*targetSpeed,blend=1-Math.exp(-dt/.084);p.vx=Number(p.vx||0)+(targetVx-Number(p.vx||0))*blend;p.vy=Number(p.vy||0)+(targetVy-Number(p.vy||0))*blend;const minX=p.activity==="lobby"?92:35,maxX=p.activity==="lobby"?1028:1085,minY=p.activity==="lobby"?145:105,maxY=p.activity==="lobby"?570:625;p.x=Math.max(minX,Math.min(maxX,p.x+p.vx*dt));p.y=Math.max(minY,Math.min(maxY,p.y+p.vy*dt));}
    const ball=this.world.lobbyBall||(this.world.lobbyBall={x:560,y:330,vx:0,vy:0,lastKickAt:0,lastKicker:""});ball.x=Number(ball.x)||560;ball.y=Number(ball.y)||330;ball.vx=Number(ball.vx)||0;ball.vy=Number(ball.vy)||0;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;const drag=Math.pow(.986,dt*60);ball.vx*=drag;ball.vy*=drag;const radius=24,minBallX=116,maxBallX=1004,minBallY=169,maxBallY=546;if(ball.x<minBallX){ball.x=minBallX;ball.vx=Math.abs(ball.vx)*.84;}else if(ball.x>maxBallX){ball.x=maxBallX;ball.vx=-Math.abs(ball.vx)*.84;}if(ball.y<minBallY){ball.y=minBallY;ball.vy=Math.abs(ball.vy)*.84;}else if(ball.y>maxBallY){ball.y=maxBallY;ball.vy=-Math.abs(ball.vy)*.84;}for(const p of lobbyPlayers){const dx=ball.x-p.x,dy=ball.y-p.y,distance=Math.hypot(dx,dy),contact=48;if(distance>=contact)continue;const nx=distance>0?dx/distance:(p.direction<0?-1:1),ny=distance>0?dy/distance:0,overlap=contact-Math.max(.001,distance);ball.x+=nx*overlap;ball.y+=ny*overlap;const approach=Number(p.vx||0)*nx+Number(p.vy||0)*ny,canKick=at-Number(ball.lastKickAt||0)>90||String(ball.lastKicker||"")!==p.id;if(canKick&&(approach>18||Math.hypot(ball.vx,ball.vy)<55)){const impulse=Math.max(285,Math.min(620,Math.max(0,approach)*1.42+245));ball.vx=nx*impulse+Number(p.vx||0)*.26;ball.vy=ny*impulse+Number(p.vy||0)*.26;const speed=Math.hypot(ball.vx,ball.vy);if(speed>650){ball.vx=ball.vx/speed*650;ball.vy=ball.vy/speed*650;}ball.lastKickAt=at;ball.lastKicker=p.id;this.broadcast({type:"lobby_ball_hit",eventId:"lobby-ball:"+this.world.tick+":"+p.id,serverTime:at,playerId:p.id,x:ball.x,y:ball.y,power:speed});}}
    for(const e of Object.values(this.world.enemies)){if(!e.alive)continue;const targets=battlePlayers.filter(p=>p.area===Number(e.area||this.world.area)&&p.hp>0);if(!targets.length)continue;targets.sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));const t=targets[0],dx=t.x-e.x,dy=t.y-e.y,l=Math.hypot(dx,dy)||1,isRanged=["ranged","sniper","fireCrystal","support"].includes(e.type),desired=isRanged?220:62,speed=e.type==="skirmisher"?170:isRanged?115:e.type==="berserker"?155:135;if(l>desired+15){e.x+=dx/l*speed*dt;e.y+=dy/l*speed*dt;e.state="chase";}else if(l<desired-25&&isRanged){e.x-=dx/l*speed*dt;e.y-=dy/l*speed*dt;e.state="retreat";}else{e.state="attack";if(Number(e.attackAt||0)<=at){e.attackAt=at+(isRanged?1450:1050);const attackEventId="enemy-attack:"+e.id+":"+this.world.tick;this.broadcast({type:"enemy_attack",eventId:attackEventId,serverTime:at,enemyId:e.id,targetId:t.id,x:e.x,y:e.y,targetX:t.x,targetY:t.y,ranged:isRanged});if(Number(t.invulnerableUntil||0)>at){this.broadcast({type:"player_evaded",eventId:attackEventId+":evade",serverTime:at,enemyId:e.id,playerId:t.id,hp:t.hp});continue;}const damage=this.enemyDamageForPlayer(e,t,battlePlayers,at);t.hp=Math.max(0,Math.round((t.hp-damage)*10)/10);if(t.hp===0)t.respawnAt=at+4000;this.broadcast({type:t.hp===0?"player_died":"player_damaged",eventId:attackEventId+":hit",serverTime:at,enemyId:e.id,playerId:t.id,damage,hp:t.hp});}}}
    for(const device of Object.values(this.world.devices)){if(device.scope!=="field")continue;const resource=this.world.resources[device.id];if(!resource||resource.remaining<=0)continue;device.progress=Number(device.progress||0)+dt;if(device.progress<2.25)continue;device.progress-=2.25;const amount=Math.min(resource.remaining,Math.max(1,Math.floor(Number(resource.quality)||1)));resource.remaining=Math.max(0,resource.remaining-amount);this.broadcast({type:"world_event",event:"resource_collected",eventId:"collect:"+device.id+":"+this.world.tick,serverTime:at,playerId:device.ownerId,entityId:device.id,data:{remaining:resource.remaining,resource:resource.resource||"rawOre",amount}});}
    const snapshot={type:"snapshot",serverTime:at,roomTime:this.world.roomTime,tick:this.world.tick,area:this.world.area,route:String(this.world.route||"center"),routeRevision:Number(this.world.routeRevision||0),lobbyBall:{x:ball.x,y:ball.y,vx:ball.vx,vy:ball.vy},players:activePlayers.map(p=>this.publicPlayer(p)),enemies:Object.values(this.world.enemies).map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp,alive:e.alive,state:e.state,type:e.type})),ack:Object.fromEntries(activePlayers.map(p=>[p.id,p.lastProcessedSequence]))};if(this.world.tick%20===0)snapshot.resources=Object.values(this.world.resources).map(r=>({id:r.id,remaining:r.remaining}));
    this.broadcast(snapshot);
    if(this.world.tick%20===0)this.state.storage.put("world",this.world);
  }

  disconnect(userId,socket){const c=this.clients.get(userId);if(!c||socket&&c.socket!==socket)return;this.clients.delete(userId);if(this.world.players[userId]){this.world.players[userId].connected=false;this.world.players[userId].moveX=0;this.world.players[userId].moveY=0;}this.broadcast({type:"player_left",serverTime:Date.now(),playerId:userId});this.state.storage.put("world",this.world);if(!this.clients.size)this.stopTick();}
}

function normalizePath(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "");
}

function unixTime() {
  return Math.floor(Date.now() / 1000);
}

function safeErrorMessage(error) {
  if (error instanceof HttpError) {
    return error.message;
  }

  const message = String(
    error?.message || error || "服务器内部错误"
  );

  return message.slice(0, 500);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function errorResponse(status, code, message) {
  return jsonResponse({
    success: false,
    code,
    message,
    error: {
      code,
      message
    }
  }, status);
}

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}
