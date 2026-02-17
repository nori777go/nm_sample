import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateImageAndStore } from '@/lib/image';
import { getSupabaseAdminClient } from '@/lib/supabase';

const bodySchema = z.object({ session_id: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { data: session } = await supabase
      .from('sessions')
      .select('ending_route')
      .eq('id', parsed.data.session_id)
      .single();

    const { data: snapshot } = await supabase
      .from('state_snapshots')
      .select('portrait_tokens')
      .eq('session_id', parsed.data.session_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const endingRoute = session?.ending_route ?? 'bitter';
    const tokens = (snapshot?.portrait_tokens ?? []) as string[];
    const prompt = `otome_anime, fixed-composition, close-up portrait, ${endingRoute} ending, ${tokens.join(', ')}`;

    const imageUrl = await generateImageAndStore({ prompt, sessionId: parsed.data.session_id });

    await supabase.from('sessions').update({ final_image_url: imageUrl }).eq('id', parsed.data.session_id);
    await supabase.from('events').insert({
      session_id: parsed.data.session_id,
      type: 'image_generated',
      payload: { image_url: imageUrl, prompt }
    });

    return NextResponse.json({ image_url: imageUrl, prompt });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
