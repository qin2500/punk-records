import type { NonThreadGuildBasedChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import { prisma } from '@punk-records/shared';
import { isCanvasChannel, channelNameToCollageName } from '../utils';

export async function handleChannelCreate(
  channel: NonThreadGuildBasedChannel
): Promise<void> {
  if (channel.type !== ChannelType.GuildText) return;
  if (!isCanvasChannel(channel.name)) return;

  const collage = await prisma.collage.create({
    data: {
      name: channelNameToCollageName(channel.name),
      discordChannelId: channel.id,
    },
  });

  try {
    const { emitCollageCreated } = await import('../socketClient');
    emitCollageCreated(collage as any);
  } catch {}
}
