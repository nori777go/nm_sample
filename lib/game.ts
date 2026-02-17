import { z } from 'zod';
import type { ChatPayload, SessionState } from './types';

export const MIN = 0;
export const MAX = 100;

export const defaultState = (): SessionState => ({
  affection: 40,
  trust: 40,
  tension: 35,
  bell: 1,
  ending_route: null,
  turns_since_touch: 3,
  portrait_tokens: []
});

const bellSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const chatPayloadSchema = z.object({
  npc_text: z.string().min(1),
  state_update: z.object({
    affection_delta: z.number().int().min(-15).max(15),
    trust_delta: z.number().int().min(-15).max(15),
    tension_delta: z.number().int().min(-15).max(15)
  }),
  bell_transition: z.object({
    to_bell: bellSchema,
    reason: z.string().min(1)
  }),
  directives: z.object({
    touch_event: z.boolean(),
    shake: z.boolean(),
    flash: z.boolean(),
    se: z.union([z.literal('heart'), z.literal('spark'), z.literal('none')]),
    log: z.string().min(1)
  })
});

export function clamp(value: number): number {
  return Math.max(MIN, Math.min(MAX, value));
}

export function applyStateDelta(state: SessionState, payload: ChatPayload): SessionState {
  const next = { ...state };
  next.affection = clamp(next.affection + payload.state_update.affection_delta);
  next.trust = clamp(next.trust + payload.state_update.trust_delta);
  next.tension = clamp(next.tension + payload.state_update.tension_delta);
  next.bell = payload.bell_transition.to_bell;
  if (next.bell >= 4 && next.ending_route === null) {
    next.ending_route = next.affection + next.trust >= 130 ? 'sweet' : 'bitter';
  }
  return next;
}

export function shouldAllowTouchEvent(turnsSinceTouch: number): boolean {
  return turnsSinceTouch >= 3;
}

export function finalizeTouchCooldown(state: SessionState, touchEvent: boolean): SessionState {
  return {
    ...state,
    turns_since_touch: touchEvent ? 0 : state.turns_since_touch + 1
  };
}
