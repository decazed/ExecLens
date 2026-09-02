/*
Scenario 13: external dependencies and mock targets.

Purpose:
- file system
- HTTP
- DB-like repository
- cache
- queue
- logger

This scenario is the future home of the mocking UX.
*/

import { readFileSync } from "node:fs";
import type { CacheClient, HttpClient, Logger, QueuePublisher, UserRepository } from "./types.js";

export function readPackageNameFromDisk(): string {
  const content = readFileSync("package.json", "utf-8");
  return content.includes('"name": "execlens"') ? "execlens" : "unknown";
}

export async function fetchTodoStatus(client: HttpClient, url: string): Promise<number> {
  const response = await client.get<{ ok: boolean }>(url);
  return response.status;
}

export async function loadUserEmail(repository: UserRepository, id: string): Promise<string> {
  const user = await repository.findById(id);
  return user?.email ?? "missing";
}

export async function readThroughCache(cache: CacheClient, key: string, fallback: string): Promise<string> {
  const cached = await cache.get(key);
  if (cached !== null) {
    return cached;
  }
  await cache.set(key, fallback, 60);
  return fallback;
}

export async function publishOrderCreated(
  publisher: QueuePublisher,
  logger: Logger,
  id: string
): Promise<string> {
  await publisher.publish("orders.created", { id, event: "created" });
  logger.info("published", { id });
  return "published";
}
