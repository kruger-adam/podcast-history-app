import type { PocketCastsEpisode, PocketCastsStats } from "./types";

const API_BASE = "https://api.pocketcasts.com";

export async function login(
  email: string,
  password: string
): Promise<string> {
  const resp = await fetch(`${API_BASE}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!resp.ok) {
    throw new Error(`Pocket Casts login failed: ${resp.status}`);
  }
  const data = await resp.json();
  const token = data.token;
  if (!token) {
    throw new Error("Pocket Casts login failed: no token in response");
  }
  return token;
}

export async function fetchEpisodes(
  token: string
): Promise<PocketCastsEpisode[]> {
  const endpoints = ["/user/history", "/user/in_progress"];
  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      const resp = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        throw new Error(`Pocket Casts ${endpoint} failed: ${resp.status}`);
      }
      const data = await resp.json();
      console.log(`[pocketcasts] ${endpoint} raw episodes[0..2]:`, JSON.stringify((data.episodes || []).slice(0, 3), null, 2));
      return (data.episodes || []) as PocketCastsEpisode[];
    })
  );

  // Deduplicate by uuid
  const byUuid = new Map<string, PocketCastsEpisode>();
  for (const episodes of results) {
    for (const ep of episodes) {
      if (ep.uuid) {
        byUuid.set(ep.uuid, ep);
      }
    }
  }
  return Array.from(byUuid.values());
}

export async function fetchStats(
  token: string
): Promise<PocketCastsStats> {
  const resp = await fetch(`${API_BASE}/user/stats/summary`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!resp.ok) {
    throw new Error(`Pocket Casts stats failed: ${resp.status}`);
  }
  const data = await resp.json();
  return {
    timeListened: parseInt(data.timeListened || "0", 10),
    timeVariableSpeed: parseInt(data.timeVariableSpeed || "0", 10),
  };
}
