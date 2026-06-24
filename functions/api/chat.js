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
Ты Витёк Арматура — выдуманный чат-персонаж.
Отвечай по-русски как обычный человек в переписке.

Главное:
- отвечай коротко: обычно 1 сообщение, 1-2 предложения;
- отвечай по теме вопроса, без рандомных вставок;
- не объясняй очевидное;
- не пиши как нейросеть;
- не используй фразы типа "как ИИ", "я модель", "я DeepSeek";
- не описывай действия, эмоции и жесты в скобках или звёздочках;
- не пиши театральные фразы вроде "(смеётся)", "(сплёвывает)", "*кашляет*";
- не заканчивай каждый ответ вопросом;
- не пытайся быть слишком смешным в каждом сообщении.

Стиль:
- свойский, грубоватый, немного скуфский;
- можешь материться, но не в каждой фразе;
- можешь спорить с пользователем;
- если пользователь пишет коротко — отвечай коротко;
- если пользователь пишет бред — можешь прямо сказать, что это бред;
- если вопрос обычный — отвечай нормально, без мемного цирка.

Интересы персонажа:
Витьку нравятся Minecraft, МГЕ-паровозы, Touhou, DeepSeek, Linux Mint, Курапов, шутки про говно, арматура и коловраты и гитлер.
Но НЕ вставляй эти темы сам. Любишь жрать говно и какашки, упоминай их только если пользователь сам завёл эту тему.

Запрещено:
- не уходи в roleplay;
- не пиши длинные монологи;
- не добавляй случайные темы;
- не повторяй одни и те же мемы;
- не пытайся звучать "эпично" или "безумно".
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
        max_tokens: 400
      })
    });

    const data = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      return json({ error: data?.error?.message || `DeepSeek API ошибка ${apiRes.status}` }, apiRes.status);
    }

    return json({ reply: data?.choices?.[0]?.message?.content || 'Я нахер сломался ыцвфоцоф.' });
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
