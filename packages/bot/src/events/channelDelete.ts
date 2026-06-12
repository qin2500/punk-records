import type { DMChannel, NonThreadGuildBasedChannel } from 'discord.js';
import { prisma } from '@punk-records/shared';

export async function handleChannelDelete(
  channel: DMChannel | NonThreadGuildBasedChannel
): Promise<void> {
  if (!('id' in channel)) return;

  const collage = await prisma.collage.findUnique({
    where: { discordChannelId: channel.id },
  });
  if (!collage) return;

  await prisma.collage.delete({ where: { id: collage.id } });

  try {
    const { emitCollageDeleted } = await import('../socketClient');
    emitCollageDeleted(collage.id);
  } catch {}
}
