import { test, expect } from '@playwright/test';
import { canTransitionMatch, type MatchCommand } from '../../api/src/core/matchTransitions';
import type { MatchStatus } from '../../api/src/types/matchState.types';

const commands: MatchCommand[] = [
  'prepare',
  'reset_prematch',
  'accept_assignment',
  'resume_assignment',
  'start_play',
  'require_decision',
  'complete',
  'cancel',
  'retry_assignment',
  'reopen',
];

test('terminal results and cancellation cannot be revived by a normal command', () => {
  for (const command of commands) {
    expect(canTransitionMatch({ status: 'cancelled' }, command), command).toBe(false);
    expect(canTransitionMatch({ status: 'completed', completed_at: 100 }, command), command).toBe(
      command === 'reopen'
    );
  }
});

test('a decision is resolved or explicitly reopened, never resumed by telemetry', () => {
  const allowed: MatchCommand[] = ['require_decision', 'complete', 'cancel', 'reopen'];
  for (const command of commands)
    expect(canTransitionMatch({ status: 'needs_decision' }, command), command).toBe(
      allowed.includes(command)
    );
});

test('assignment and play follow readiness; retries do not complete a match', () => {
  for (const status of ['pending', 'ready', 'loaded', 'live'] satisfies MatchStatus[]) {
    expect(canTransitionMatch({ status }, 'accept_assignment')).toBe(status === 'ready');
    expect(canTransitionMatch({ status }, 'prepare')).toBe(
      status === 'pending' || status === 'ready'
    );
    expect(canTransitionMatch({ status }, 'reopen')).toBe(false);
  }
  expect(canTransitionMatch({ status: 'completed' }, 'start_play')).toBe(true);
});
