export type Bell = 1 | 2 | 3 | 4 | 5;
export type EndingRoute = 'sweet' | 'bitter' | null;

export type TouchKind = 'ui_shake' | 'flash' | 'se';

export interface SessionState {
  affection: number;
  trust: number;
  tension: number;
  bell: Bell;
  ending_route: EndingRoute;
  turns_since_touch: number;
  portrait_tokens: string[];
}

export interface ChatDirective {
  touch_event: boolean;
  shake: boolean;
  flash: boolean;
  se: 'heart' | 'spark' | 'none';
  log: string;
}

export interface ChatPayload {
  npc_text: string;
  state_update: {
    affection_delta: number;
    trust_delta: number;
    tension_delta: number;
  };
  bell_transition: {
    to_bell: Bell;
    reason: string;
  };
  directives: ChatDirective;
}
