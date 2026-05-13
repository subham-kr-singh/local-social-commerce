/**
 * agora-token ships as CommonJS; named ESM imports fail at runtime under "type":"module".
 * Load via createRequire — same pattern as scripts/test-livestream-agora.ts.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const { RtcRole, RtcTokenBuilder } = require("agora-token") as typeof import("agora-token");
