'use client';

import { FormEvent, useState } from 'react';

export function ChatInput({ onSend, disabled }: { onSend: (text: string) => Promise<void>; disabled?: boolean }) {
  const [text, setText] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    await onSend(trimmed);
  };

  return (
    <form className="chat-input" onSubmit={submit}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="自由入力で話しかける…" disabled={disabled} />
      <button type="submit" disabled={disabled}>送信</button>
    </form>
  );
}
