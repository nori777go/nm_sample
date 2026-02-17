import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractPortraitTokens } from '@/lib/llm';
import { getSupabaseAdminClient } from '@/lib/supabase';

const bodySchema = z.object({ session_id: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: turns, error } = await supabase
      .from('turns')
      .select('text')
      .eq('session_id', parsed.data.session_id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transcript = (turns ?? []).map((t) => t.text).join(' ');
    const portraitTokens = await extractPortraitTokens(transcript);

    await supabase.from('state_snapshots').insert({
      session_id: parsed.data.session_id,
      portrait_tokens: portraitTokens
    });

    await supabase.from('events').insert({
      session_id: parsed.data.session_id,
      type: 'portrait_tokens',
      payload: { portrait_tokens: portraitTokens }
    });

    return NextResponse.json({ portrait_tokens: portraitTokens });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
