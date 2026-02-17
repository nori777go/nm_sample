interface Message {
  role: 'user' | 'npc';
  text: string;
}

export function ChatLog({ messages }: { messages: Message[] }) {
  return (
    <div className="chat-log">
      {messages.map((msg, idx) => (
        <div key={idx} className={`bubble ${msg.role}`}>
          <strong>{msg.role === 'user' ? 'あなた' : '彼'}</strong>
          <p>{msg.text}</p>
        </div>
      ))}
    </div>
  );
}
