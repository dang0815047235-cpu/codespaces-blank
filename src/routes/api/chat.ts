import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, system } = await request.json() as {
            messages: Array<{ role: 'user' | 'assistant'; content: string }>;
            system?: string;
          };
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), { status: 500 });

          const payload = {
            model: 'google/gemini-3.1-flash-lite-preview',
            messages: [
              ...(system ? [{ role: 'system', content: system }] : []),
              ...messages.map(m => ({ role: m.role, content: m.content })),
            ],
          };

          const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Lovable-API-Key': key,
              'X-Lovable-AIG-SDK': 'manual',
            },
            body: JSON.stringify(payload),
          });

          if (!r.ok) {
            const errText = await r.text();
            return new Response(JSON.stringify({ error: errText, status: r.status }), { status: r.status });
          }
          const data = await r.json() as any;
          const reply = data?.choices?.[0]?.message?.content ?? '';
          return Response.json({ reply });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message || 'AI error' }), { status: 500 });
        }
      },
    },
  },
});