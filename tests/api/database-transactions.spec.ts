import { test, expect } from '@playwright/test';
import { db } from '../../api/src/config/database';

test('a transaction rolls back writes made through called db helpers', async () => {
  const key = 'panel-transition-rollback-test';
  await expect(
    db.transaction(async () => {
      await db.setAppSettingAsync(key, 'must roll back');
      expect(await db.getAppSettingAsync(key)).toBe('must roll back');
      throw new Error('rollback');
    })
  ).rejects.toThrow('rollback');
  expect(await db.getAppSettingAsync(key)).toBeNull();
});
