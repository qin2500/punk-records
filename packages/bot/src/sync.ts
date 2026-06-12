import type { Client } from 'discord.js';
import { ChannelType } from 'discord.js';
import { prisma } from '@punk-records/shared';
import { isCanvasChannel, channelNameToCollageName } from './utils';

export async function syncChannels(client: Client): Promise<void> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) throw new Error('DISCORD_GUILD_ID is not set');

  const guild = await client.guilds.fetch(guildId);
  const channels = await guild.channels.fetch();

  const canvasChannels = [...channels.values()].filter(
    (ch): ch is NonNullable<typeof ch> =>
      ch !== null && ch.type === ChannelType.GuildText && isCanvasChannel(ch.name ?? '')
  );

  const liveIds = new Set(canvasChannels.map((ch) => ch!.id));
  const dbCollages = await prisma.collage.findMany();
  const dbIds = new Set(dbCollages.map((c) => c.discordChannelId));

  // Insert missing
  for (const ch of canvasChannels) {
    if (!ch) continue;
    if (!dbIds.has(ch.id)) {
      await prisma.collage.create({
        data: {
          name: channelNameToCollageName(ch.name ?? ''),
          discordChannelId: ch.id,
        },
      });
      console.log(`[sync] Created collage for #${ch.name}`);
    }
  }

  // Remove stale
  for (const collage of dbCollages) {
    if (!liveIds.has(collage.discordChannelId)) {
      await prisma.collage.delete({ where: { id: collage.id } });
      console.log(`[sync] Deleted stale collage: ${collage.name}`);
    }
  }

  console.log('[sync] Channel sync complete');
}
