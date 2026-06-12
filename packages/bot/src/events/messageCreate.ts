import type { Message, TextChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import { prisma } from '@punk-records/shared';
import { isCanvasChannel, extractUrl } from '../utils';
import { scrapeAndUpdateCard } from '../cardService';

export async function handleMessageCreate(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (message.channel.type !== ChannelType.GuildText) return;

  const channel = message.channel as TextChannel;
  if (!isCanvasChannel(channel.name)) return;

  const collage = await prisma.collage.findUnique({
    where: { discordChannelId: channel.id },
    include: { _count: { select: { cards: true } } },
  });
  if (!collage) return;

  const { goldenAnglePosition } = await import('../layout');
  const n = collage._count.cards;
  const { x, y } = goldenAnglePosition(n);

  const url = extractUrl(message.content);
  const isLink = url !== null;

  const card = await prisma.card.create({
    data: {
      collageId: collage.id,
      type: isLink ? 'LINK' : 'NOTE',
      content: message.content,
      url: url ?? null,
      x,
      y,
      source: 'DISCORD',
      discordMessageId: message.id,
    },
  });

  // Emit card:created via API emitter (shared socket)
  try {
    const { emitCardCreated } = await import('../socketClient');
    emitCardCreated(collage.id, card as any);
  } catch {}

  if (isLink && url) {
    scrapeAndUpdateCard(card.id, collage.id, url).catch(() => {});
  }
}
