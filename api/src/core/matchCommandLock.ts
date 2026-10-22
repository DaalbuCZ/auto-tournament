import { AsyncLocalStorage } from 'node:async_hooks';
import { db } from '../config/database';

interface HeldLock {
  slug: string;
  active: boolean;
  parent?: HeldLock;
}
const held = new AsyncLocalStorage<HeldLock>();

/** Results, cancellation and reopen share a lock, including across API processes. */
export async function withMatchCommandLock<T>(slug: string, run: () => Promise<T>): Promise<T> {
  const parent = held.getStore();
  for (let lock = parent; lock; lock = lock.parent) {
    if (lock.active && lock.slug === slug) return run();
  }
  return db.withClient(async (client) => {
    const key = `match-command:${slug}`;
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [key]);
    const lock: HeldLock = { slug, active: true, parent };
    try {
      return await db.withConnection(client, () => held.run(lock, run));
    } finally {
      lock.active = false;
      await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [key]);
    }
  });
}
