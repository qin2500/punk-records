import cron from 'node-cron';
import { prisma } from '@punk-records/shared';

// Supabase's free tier pauses projects after a stretch of no database activity.
// A weekly no-op query is enough to keep it counted as active.
export function startKeepalive(): void {
  cron.schedule('0 0 * * 0', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[keepalive] Supabase ping succeeded');
    } catch (err) {
      console.error('[keepalive] Supabase ping failed:', err);
    }
  });
}
