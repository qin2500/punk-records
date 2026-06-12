import { redirect } from 'next/navigation';

async function getFirstCollageId(): Promise<string | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/api/collages`, { cache: 'no-store' });
    if (!res.ok) return null;
    const collages = await res.json();
    return collages[0]?.id ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const id = await getFirstCollageId();
  if (id) redirect(`/canvas/${id}`);

  return (
    <div className="flex h-screen items-center justify-center flex-col gap-4 text-center px-6">
      <h1 className="text-3xl font-bold tracking-tight">Punk Records</h1>
      <p className="text-zinc-400 max-w-sm">
        Create a Discord channel starting with <code className="bg-zinc-800 px-1 rounded">canvas-</code> to get started. Your first collage will appear here.
      </p>
    </div>
  );
}
