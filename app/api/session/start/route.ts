import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { defaultState } from '@/lib/game';
import { getSupabaseAdminClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = getSupabaseAdminClient();
    const sessionId = randomUUID();
    const state = defaultState();

    const { error } = await supabase.from('sessions').insert({
      id: sessionId,
      current_bell: state.bell,
      ending_route: state.ending_route,
      final_image_url: null
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('state_snapshots').insert({
      session_id: sessionId,
      bell: state.bell,
      affection: state.affection,
      trust: state.trust,
      tension: state.tension,
      ending_route: state.ending_route,
      portrait_tokens: state.portrait_tokens
    });

    return NextResponse.json({ session_id: sessionId, state });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
