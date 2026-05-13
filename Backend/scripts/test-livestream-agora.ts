/**
 * Smoke-test Agora RTC token generation (same logic as POST /livestreams/:id/agora-token).
 *
 * Usage:
 *   Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in Backend/.env (or env).
 *   npm run test:livestream-agora -- [channelName]
 *
 * Then use any Agora sample app (Web demo, Android, iOS) with:
 *   - App ID from output
 *   - Channel = printed channel name
 *   - Token = host or audience token (role must match)
 *   - UID = 0 (same as API)
 *
 * Full livestream flow (manual):
 *   1. Seller: POST /api/v1/livestreams (JWT seller) → get stream id & streamKey (channel).
 *   2. Seller: POST /api/v1/livestreams/:id/start
 *   3. Seller: POST /api/v1/livestreams/:id/agora-token { "role": "host" }
 *   4. Buyer: POST /api/v1/livestreams/:id/agora-token { "role": "audience" }
 *   5. Join the same channel in two clients; host publishes, audience subscribes.
 */
import "dotenv/config";
import { RtcRole, RtcTokenBuilder } from "../src/lib/agoraRtcToken.js";

const appId = process.env.AGORA_APP_ID?.trim();
const cert = process.env.AGORA_APP_CERTIFICATE?.trim();

if (!appId || !cert) {
  console.error("Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE in environment.");
  process.exit(1);
}

const hex32 = /^[0-9a-fA-F]{32}$/;
if (!hex32.test(appId) || !hex32.test(cert)) {
  console.error(
    "Agora token v2 requires AGORA_APP_ID and AGORA_APP_CERTIFICATE each to be exactly 32 hexadecimal characters (copy from Agora Console).",
  );
  process.exit(1);
}

const channel = process.argv[2]?.trim() || `test-${Date.now()}`;
const uid = 0;
const now = Math.floor(Date.now() / 1000);
const expire = now + 3600;

const hostToken = RtcTokenBuilder.buildTokenWithUid(
  appId,
  cert,
  channel,
  uid,
  RtcRole.PUBLISHER,
  expire,
  expire,
);

const audienceToken = RtcTokenBuilder.buildTokenWithUid(
  appId,
  cert,
  channel,
  uid,
  RtcRole.SUBSCRIBER,
  expire,
  expire,
);

console.log(
  JSON.stringify(
    {
      channel,
      appId,
      uid,
      expiresAtUnix: expire,
      hostToken,
      audienceToken,
      hint: "Use channel as Agora channel name; pick the token matching your client role.",
    },
    null,
    2,
  ),
);
