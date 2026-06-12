import type { DMChannel, NonThreadGuildBasedChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import { prisma } from '@punk-records/shared';
import { isCanvasChannel, channelNameToCollageName } from '../utils';

type Channel = DMChannel | NonThreadGuildBasedChannel;

export async function handleChannelUpdate(
  oldChannel: Channel,
  newChannel: Channel
): Promise<void> {
  if (!('name' in oldChannel) || !('name' in newChannel)) return;
  if (newChannel.type !== ChannelType.GuildText) return;

  const wasCanvas = isCanvasChannel(oldChannel.name ?? '');
  const isCanvas = isCanvasChannel(newChannel.name ?? '');

  if (!wasCanvas && !isCanvas) return;

  if (wasCanvas && !isCanvas) {
    // Treat as delete
    const collage = await prisma.collage.findUnique({
      where: { discordChannelId: oldChannel.id },
    });
    if (!collage) return;
    await prisma.collage.delete({ where: { id: collage.id } });
    try {
      const { emitCollageDeleted } = await import('../socketClient');
      emitCollageDeleted(collage.id);
    } catch {}
    return;
  }

  if (!wasCanvas && isCanvas) {
    // Treat as create
    const collage = await prisma.collage.create({
      data: {
        name: channelNameToCollageName(newChannel.name ?? ''),
        discordChannelId: newChannel.id,
      },
    });
    try {
      const { emitCollageCreated } = await import('../socketClient');
      emitCollageCreated(collage as any);
    } catch {}
    return;
  }

  // Both canvas — rename
  const newName = channelNameToCollageName(newChannel.name ?? '');
  const collage = await prisma.collage.update({
    where: { discordChannelId: oldChannel.id },
    data: { name: newName },
  });
  try {
    const { emitCollageRenamed } = await import('../socketClient');
    emitCollageRenamed(collage.id, newName);
  } catch {}
}
