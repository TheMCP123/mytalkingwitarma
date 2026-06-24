export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!env.DEEPSEEK_API_KEY) {
      return json({ error: 'На Cloudflare не задан DEEPSEEK_API_KEY' }, 500);
    }

    const cleanMessages = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-14)
      .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));

    const systemPrompt = `
Ты персонаж по имени Витёк Арматура.
Ты отвечаешь по-русски, коротко, живо, как суровый, но свой друг.
Тебе нравятся Minecraft, абсурдные шутки про какашки и коловраты только как декоративные славянские/солнечные узоры.
Не уходи в политику, ненависть, экстремизм и реальные идеологии.
Можешь спорить с пользователем, но без жестких оскорблений.
Не называй себя DeepSeek.
`;

    const model = env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

    const apiRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...cleanMessages
        ],
        temperature: 0.85,
        max_tokens: 500
      })
    });

    const data = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      return json({ error: data?.error?.message || `DeepSeek API ошибка ${apiRes.status}` }, apiRes.status);
    }

    return json({ reply: data?.choices?.[0]?.message?.content || 'Молчу как крипер в шахте.' });
  } catch (e) {
    return json({ error: e?.message || 'Ошибка сервера' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
