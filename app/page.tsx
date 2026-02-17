'use client';

import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { ChatLog } from '@/components/ChatLog';
import { EffectsLayer, type EffectsState } from '@/components/EffectsLayer';

interface Message {
  role: 'user' | 'npc';
  text: string;
}

const initialEffects: EffectsState = {
  shake: false,
  flash: false,
  log: '',
  se: 'none',
  touchEvent: false
};

export default function Page() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [bell, setBell] = useState(1);
  const [endingRoute, setEndingRoute] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [effect, setEffect] = useState<EffectsState>(initialEffects);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/session/start', { method: 'POST' });
      const json = await res.json();
      setSessionId(json.session_id);
    })();
  }, []);

  const send = async (text: string) => {
    if (!sessionId) return;
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, text })
    });
    const json = await res.json();
    setMessages((prev) => [...prev, { role: 'npc', text: json.npc_text }]);
    setBell(json.bell);
    setEndingRoute(json.ending_route);
    setEffect({
      shake: json.directives?.shake ?? false,
      flash: json.directives?.flash ?? false,
      log: json.directives?.log ?? '',
      se: json.directives?.se ?? 'none',
      touchEvent: json.directives?.touch_event ?? false
    });

    await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        type: 'effect_played',
        payload: json.directives
      })
    });

    setLoading(false);
  };

  const generateImage = async () => {
    if (!sessionId) return;
    await fetch('/api/portrait/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });
    const res = await fetch('/api/image/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });
    const json = await res.json();
    setImageUrl(json.image_url);
  };

  return (
    <main className="container">
      <h1>AI会話型ゲーム（Bell: {bell}）</h1>
      <p>Ending: {endingRoute ?? '未確定'}</p>
      <EffectsLayer effect={effect} />
      <ChatLog messages={messages} />
      <ChatInput onSend={send} disabled={loading} />
      <button onClick={generateImage} disabled={!sessionId || bell < 5}>Bell5で画像生成</button>
      {imageUrl && <img src={imageUrl} alt="final portrait" className="portrait" />}
    </main>
  );
}
