import { env } from "./env.js";

export const agoraConfig = {
  appId: env.AGORA_APP_ID ?? "",
  appCertificate: env.AGORA_APP_CERTIFICATE ?? "",
} as const;
