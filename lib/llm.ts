import type { ChatPayload } from './types';

interface ChatInput {
  userText: string;
  bell: number;
}

export async function callChatLlm(input: ChatInput): Promise<string> {
  // Placeholder deterministic JSON for local development.
  const positive = /(好き|うれしい|ありがとう|会いたい|信じ|優しい)/.test(input.userText);
  const payload: ChatPayload = {
    npc_text: positive ? 'そんな風に言ってくれると、胸が熱くなるよ。' : 'うん…まだ少し距離がある気がする。',
    state_update: {
      affection_delta: positive ? 10 : -4,
      trust_delta: positive ? 8 : -2,
      tension_delta: positive ? -2 : 3
    },
    bell_transition: {
      to_bell: Math.min(5, input.bell + 1) as 1 | 2 | 3 | 4 | 5,
      reason: positive ? '感情が深まり章が進行' : '会話継続で章進行'
    },
    directives: {
      touch_event: positive,
      shake: !positive,
      flash: positive,
      se: positive ? 'heart' : 'spark',
      log: positive ? '指先が触れて、空気が甘く揺れた。' : '緊張が走り、視界がわずかに揺れた。'
    }
  };
  return JSON.stringify(payload);
}

export async function extractPortraitTokens(text: string): Promise<string[]> {
  const tokens = Array.from(new Set(text.split(/\s+/).filter(Boolean))).slice(0, 20);
  return tokens.length ? tokens : ['soft-light', 'anime-eyes', 'romantic-mood'];
}
