import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase';

const bodySchema = z.object({
  session_id: z.string().uuid(),
  type: z.string().min(1),
  payload: z.record(z.any())
});

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('events').insert({
      session_id: parsed.data.session_id,
      type: `telemetry:${parsed.data.type}`,
      payload: parsed.data.payload
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
