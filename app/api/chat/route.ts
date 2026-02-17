import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyStateDelta, chatPayloadSchema, defaultState, finalizeTouchCooldown, shouldAllowTouchEvent } from '@/lib/game';
import { callChatLlm } from '@/lib/llm';
import { getSupabaseAdminClient } from '@/lib/supabase';
import type { SessionState } from '@/lib/types';

const bodySchema = z.object({
  session_id: z.string().uuid().optional(),
  text: z.string().min(1)
});

async function getLatestState(sessionId: string): Promise<SessionState> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('state_snapshots')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return defaultState();
  }

  return {
    affection: data.affection,
    trust: data.trust,
    tension: data.tension,
    bell: data.bell,
    ending_route: data.ending_route,
    turns_since_touch: data.turns_since_touch ?? 3,
    portrait_tokens: data.portrait_tokens ?? []
  };
}

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    let sessionId = parsed.data.session_id;

    if (!sessionId) {
      const start = await fetch(new URL('/api/session/start', req.url), { method: 'POST' });
      const startJson = await start.json();
      sessionId = startJson.session_id;
    }

    await supabase.from('turns').insert({
      session_id: sessionId,
      role: 'user',
      text: parsed.data.text
    });

    const current = await getLatestState(sessionId!);

    let raw = '';
    let payload: z.infer<typeof chatPayloadSchema> | null = null;
    for (let i = 0; i < 3; i += 1) {
      raw = await callChatLlm({ userText: parsed.data.text, bell: current.bell });
      const maybe = chatPayloadSchema.safeParse(JSON.parse(raw));
      if (maybe.success) {
        payload = maybe.data;
        break;
      }
    }

    if (!payload) {
      return NextResponse.json({ error: 'LLM JSON validation failed after retries' }, { status: 502 });
    }

    if (!shouldAllowTouchEvent(current.turns_since_touch)) {
      payload.directives.touch_event = false;
      payload.directives.shake = false;
      payload.directives.flash = false;
      payload.directives.se = 'none';
      payload.directives.log = '演出クールダウン中…';
    }

    const updated = finalizeTouchCooldown(applyStateDelta(current, payload), payload.directives.touch_event);

    await supabase.from('turns').insert({
      session_id: sessionId,
      role: 'npc',
      text: payload.npc_text,
      raw_llm_json: {
        npc_text: payload.npc_text,
        state_update: payload.state_update,
        bell_transition: payload.bell_transition,
        directives: payload.directives
      }
    });

    await supabase.from('sessions').update({
      current_bell: updated.bell,
      ending_route: updated.ending_route
    }).eq('id', sessionId);

    await supabase.from('state_snapshots').insert({
      session_id: sessionId,
      bell: updated.bell,
      affection: updated.affection,
      trust: updated.trust,
      tension: updated.tension,
      ending_route: updated.ending_route,
      portrait_tokens: updated.portrait_tokens,
      turns_since_touch: updated.turns_since_touch
    });

    const events = [
      { session_id: sessionId, type: 'bell', payload: payload.bell_transition },
      { session_id: sessionId, type: 'touch', payload: payload.directives }
    ];

    if (updated.bell === 4 && updated.ending_route) {
      events.push({ session_id: sessionId, type: 'ending', payload: { route: updated.ending_route } });
    }

    await supabase.from('events').insert(events);

    return NextResponse.json({
      session_id: sessionId,
      npc_text: payload.npc_text,
      bell: updated.bell,
      ending_route: updated.ending_route,
      directives: payload.directives,
      state: {
        affection: updated.affection,
        trust: updated.trust,
        tension: updated.tension
      }
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
