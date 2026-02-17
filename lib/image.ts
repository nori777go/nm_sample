interface GenerateImageInput {
  prompt: string;
  sessionId: string;
}

export async function generateImageAndStore({ prompt, sessionId }: GenerateImageInput): Promise<string> {
  // Placeholder image URL for implementation skeleton.
  const encoded = encodeURIComponent(prompt.slice(0, 80));
  return `https://dummyimage.com/1024x1024/ffe4f0/523344.png&text=${sessionId}-${encoded}`;
}
