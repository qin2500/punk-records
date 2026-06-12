import ogs from 'open-graph-scraper';
import { prisma } from '@punk-records/shared';

export async function scrapeAndUpdateCard(
  cardId: string,
  collageId: string,
  url: string
): Promise<void> {
  try {
    const { result } = await ogs({ url, timeout: 10000 });
    const image =
      result.ogImage && Array.isArray(result.ogImage) && result.ogImage[0]
        ? result.ogImage[0].url
        : undefined;

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: {
        ogTitle: result.ogTitle ?? null,
        ogDescription: result.ogDescription ?? null,
        ogImage: image ?? null,
        ogSiteName: result.ogSiteName ?? null,
        ogFavicon: result.favicon ?? null,
      },
    });

    try {
      const { emitCardUpdated } = await import('./socketClient');
      emitCardUpdated(collageId, cardId, updated as any);
    } catch {}
  } catch {}
}
