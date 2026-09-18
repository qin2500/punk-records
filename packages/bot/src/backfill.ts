import type { Client, TextChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import { prisma } from '@punk-records/shared';
import { handleMessageCreate } from './events/messageCreate';

// The gateway only delivers messageCreate events while connected — any message
// posted during a restart/redeploy would otherwise never become a card. This
// catches each collage's channel up to the last message we actually recorded.
export async function backfillMissedMessages(client: Client): Promise<void> {
  const collages = await prisma.collage.findMany();

  for (const collage of collages) {
    const channel = await client.channels.fetch(collage.discordChannelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) continue;

    const cards = await prisma.card.findMany({
      where: { collageId: collage.id, discordMessageId: { not: null } },
      select: { discordMessageId: true },
    });
    const lastId = cards.reduce<bigint | null>((max, c) => {
      const id = BigInt(c.discordMessageId!);
      return max === null || id > max ? id : max;
    }, null);

    await backfillChannel(channel as TextChannel, lastId?.toString());
  }

  console.log('[backfill] Missed-message backfill complete');
}

async function backfillChannel(channel: TextChannel, afterId: string | undefined): Promise<void> {
  let cursor = afterId;
  let totalProcessed = 0;

  for (;;) {
    const batch = await channel.messages.fetch({ after: cursor, limit: 100 });
    if (batch.size === 0) break;

    const ordered = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const message of ordered) {
      await handleMessageCreate(message);
    }

    totalProcessed += ordered.length;
    cursor = ordered[ordered.length - 1]!.id;

    if (batch.size < 100) break;
  }

  if (totalProcessed > 0) {
    console.log(`[backfill] #${channel.name}: processed ${totalProcessed} missed message(s)`);
  }
}
