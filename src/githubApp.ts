/*
import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import type { RestEndpointMethodTypes } from "@octokit/rest";

export async function getInstallationOctokit(
  installationId: number
): Promise<any> {
  const app = new App({
    appId: process.env.APP_ID!,
    privateKey: process.env.PRIVATE_KEY!,
  });

  return await app.getInstallationOctokit(installationId);
}
  */
import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import type { RestEndpointMethodTypes } from "@octokit/rest";
console.log("APP_ID from env:", process.env.APP_ID);

const app = new App({
  appId: process.env.APP_ID!,
  privateKey: process.env.PRIVATE_KEY!,
});

export async function getInstallationOctokit(installationId: number) {
  // 1. Use the App's own Octokit to request an installation token
  const { data } = await app.octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    {
      installation_id: installationId,
    }
  );

  // 2. Create a REST-enabled Octokit using that token
  return new Octokit({
    auth: data.token,
  });
}
