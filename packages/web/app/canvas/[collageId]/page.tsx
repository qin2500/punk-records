import { notFound } from 'next/navigation';
import { fetchCollage, fetchCards, fetchCollages } from '../../../lib/api';
import CanvasPageClient from '../../../components/CanvasPageClient';

interface Props {
  params: { collageId: string };
}

export default async function CanvasPage({ params }: Props) {
  const [collage, cards, allCollages] = await Promise.all([
    fetchCollage(params.collageId).catch(() => null),
    fetchCards(params.collageId).catch(() => []),
    fetchCollages().catch(() => []),
  ]);

  if (!collage) notFound();

  return (
    <CanvasPageClient
      collage={collage}
      initialCards={cards}
      allCollages={allCollages}
    />
  );
}
