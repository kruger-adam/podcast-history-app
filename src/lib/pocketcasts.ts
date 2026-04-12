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
  const [historyData, inProgressData] = await Promise.all(
    ["/user/history", "/user/in_progress"].map(async (endpoint) => {
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
      return resp.json();
    })
  );

  const historyEpisodes = (historyData.episodes || []) as PocketCastsEpisode[];
  const inProgressEpisodes = (inProgressData.episodes || []) as PocketCastsEpisode[];

  const now = Date.now();
  const byUuid = new Map<string, PocketCastsEpisode>();

  // Assign listenedDate based on position in history — index 0 is most recent
  historyEpisodes.forEach((ep, index) => {
    if (ep.uuid) {
      byUuid.set(ep.uuid, {
        ...ep,
        listenedDate: new Date(now - index * 60_000).toISOString(),
      });
    }
  });

  // In-progress episodes not already in history get the current time
  inProgressEpisodes.forEach((ep) => {
    if (ep.uuid && !byUuid.has(ep.uuid)) {
      byUuid.set(ep.uuid, {
        ...ep,
        listenedDate: new Date(now).toISOString(),
      });
    }
  });

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
