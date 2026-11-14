import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAiGateway } from "ai-gateway-provider";
import { createWorkersAI } from "workers-ai-provider";

const accountId = process.env.CF_ACCOUNT_ID?.trim();
const gatewayName = process.env.CF_AI_GATEWAY_NAME?.trim();
const gatewayToken = process.env.CF_AI_GATEWAY_TOKEN?.trim();
const workersAiToken = process.env.CF_WORKERS_AI_TOKEN?.trim();
const googleApiKey = process.env.GOOGLE_API_KEY?.trim();

export const aigateway =
  accountId && gatewayName
    ? createAiGateway({
        accountId,
        gateway: gatewayName,
        apiKey: gatewayToken || undefined,
      })
    : null;

export const workersai =
  accountId && workersAiToken
    ? createWorkersAI({
        accountId,
        apiKey: workersAiToken,
      })
    : null;

export const google = googleApiKey
  ? createGoogleGenerativeAI({
      apiKey: googleApiKey,
    })
  : null;
