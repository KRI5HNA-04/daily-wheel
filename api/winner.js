const TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days

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
  if (!response.ok || data.error) throw new Error(data.error || "Redis request failed");
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  const teamId = typeof req.query?.t === "string" ? req.query.t : "";
  if (!/^[A-Za-z0-9_-]{8,20}$/.test(teamId)) {
    return res.status(400).json({ error: "Invalid team id." });
  }

  const key = `scrum-wheel:winner:${teamId}`;

  try {
    if (req.method === "GET") {
      const raw = await redisCommand(["GET", key]);
      if (!raw) return res.status(200).json({ entry: null });
      const entry = typeof raw === "string" ? JSON.parse(raw) : raw;
      return res.status(200).json({ entry });
    }

    if (req.method === "POST") {
      const { entry } = req.body || {};
      if (!entry?.id || !entry?.name || typeof entry?.date !== "number") {
        return res.status(400).json({ error: "Invalid entry." });
      }
      const safe = {
        id: String(entry.id).slice(0, 40),
        name: String(entry.name).slice(0, 30),
        date: Number(entry.date),
      };
      await redisCommand(["SET", key, JSON.stringify(safe), "EX", TTL_SECONDS]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error("Winner API error:", error);
    if (error?.code === "REDIS_NOT_CONFIGURED") {
      return res.status(503).json({ error: "Sharing storage is not configured." });
    }
    return res.status(500).json({ error: "Unable to process winner." });
  }
}
