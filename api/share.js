import { randomBytes } from "node:crypto";

const TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days
const MAX_PEOPLE = 50;
const MAX_NAME_LENGTH = 30;

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

async function redisCommand(command) {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    const error = new Error("Redis is not configured");
    error.code = "REDIS_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || "Redis request failed");
  }

  return data.result;
}

function normalizePeople(people) {
  if (!Array.isArray(people)) return null;

  const normalized = people
    .slice(0, MAX_PEOPLE)
    .map((person) => ({
      id: typeof person?.id === "string" ? person.id : randomBytes(6).toString("base64url"),
      name: typeof person?.name === "string" ? person.name.trim().slice(0, MAX_NAME_LENGTH) : "",
      color: typeof person?.color === "string" ? person.color : undefined,
      present: person?.present !== false,
    }))
    .filter((person) => person.name.length > 0);

  return normalized.length ? normalized : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  try {
    if (req.method === "POST") {
      const people = normalizePeople(req.body?.people);
      if (!people) {
        return res.status(400).json({ error: "At least one participant is required." });
      }

      const id = randomBytes(8).toString("base64url");
      await redisCommand(["SET", `scrum-wheel:share:${id}`, JSON.stringify({ people }), "EX", TTL_SECONDS]);

      return res.status(201).json({ id });
    }

    if (req.method === "GET") {
      const id = typeof req.query?.s === "string" ? req.query.s : "";
      if (!/^[A-Za-z0-9_-]{8,20}$/.test(id)) {
        return res.status(400).json({ error: "Invalid share id." });
      }

      const raw = await redisCommand(["GET", `scrum-wheel:share:${id}`]);
      if (!raw) {
        return res.status(404).json({ error: "This share link has expired or does not exist." });
      }

      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      return res.status(200).json(data);
    }

    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error("Share API error:", error);

    if (error?.code === "REDIS_NOT_CONFIGURED") {
      return res.status(503).json({
        error: "Sharing storage is not configured. Connect Upstash Redis to this Vercel project.",
      });
    }

    return res.status(500).json({ error: "Unable to process share link." });
  }
}
