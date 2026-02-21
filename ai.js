// ai.js - Cerebras AI Integration

function getCerebrasKey() {
    let key = localStorage.getItem('cerebras_api_key');
    if (!key) {
        key = prompt('Clarity AI: Please enter your Cerebras API Key to enable Email Intelligence (It will be saved securely to your browser area):');
        if (key) localStorage.setItem('cerebras_api_key', key);
    }
    return key;
}

async function generateEmailIntelligence(emails) {
    if (!emails || emails.length === 0) return null;

    const token = getCerebrasKey();
    if (!token) return null;

    const systemPrompt = `You are an executive productivity intelligence assistant inside a personal LifeOS dashboard.

You receive:
Recent emails (last 24 hours)
Structured email data including:
account (personal or school)
from
subject
snippet
internalDate

Your task:
Identify emails that require action.
Detect urgency (deadlines, reminders, time-sensitive language).
Ignore marketing or irrelevant emails unless action is required.
Suggest what the user should focus on today based on email signals.

⚠️ IMPORTANT RULES:
DO NOT write paragraphs.
DO NOT explain reasoning.
DO NOT output text outside JSON.
Return ONLY valid JSON.
Keep each notification short (max 12 words).
Be concise and decisive.

Return JSON in this exact format:
{
  "notifications": [
    {
      "type": "action" | "info" | "urgent",
      "text": "Short bullet point",
      "priority": "low" | "medium" | "high"
    }
  ],
  "today_focus": "One short decisive suggestion."
}

If no important emails exist:
Return empty notifications array and today_focus as null.`;

    try {
        const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3.1-8b',
                temperature: 0.3,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: JSON.stringify(emails) }
                ]
            })
        });

        if (!response.ok) {
            console.error('Cerebras API Error:', await response.text());
            return null;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(content);
    } catch (e) {
        console.error('Error generating email intelligence:', e);
        return null;
    }
}
