import type { NonThreadGuildBasedChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import { prisma } from '@punk-records/shared';
import { isCanvasChannel, isPrivateChannel, channelNameToCollageName } from '../utils';

export async function handleChannelCreate(
  channel: NonThreadGuildBasedChannel
): Promise<void> {
  if (channel.type !== ChannelType.GuildText) return;
  if (!isCanvasChannel(channel.name)) return;

  // upsert, not create: a channel can also be created by the API's import
  // flow (packages/api/src/routes/data.ts), which writes its own Collage row
  // directly. Without this, that write races with this gateway handler's
  // insert and one side throws on the unique discordChannelId constraint.
  const collage = await prisma.collage.upsert({
    where: { discordChannelId: channel.id },
    update: {},
    create: {
      name: channelNameToCollageName(channel.name),
      discordChannelId: channel.id,
      isPrivate: isPrivateChannel(channel.name),
    },
  });

  try {
    const { emitCollageCreated } = await import('../socketClient');
    emitCollageCreated(collage as any);
  } catch {}
}
