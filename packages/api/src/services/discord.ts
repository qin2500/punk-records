const CANVAS_PREFIX = 'canvas-';
const PRIVATE_PREFIX = 'canvas-private-';

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export async function listGuildChannels(
  guildId: string,
  token: string
): Promise<DiscordChannel[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list guild channels: ${text}`);
  }
  const channels = (await res.json()) as DiscordChannel[];
  return channels.filter((c) => c.type === 0);
}

export async function createEmptyChannel(
  guildId: string,
  token: string,
  name: string
): Promise<DiscordChannel> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, type: 0 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create channel "${name}": ${text}`);
  }
  return (await res.json()) as DiscordChannel;
}

export function collageNameToChannelName(name: string, isPrivate: boolean): string {
  const prefix = isPrivate ? PRIVATE_PREFIX : CANVAS_PREFIX;
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  const fallback = `imported-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}${slug || fallback}`;
}
