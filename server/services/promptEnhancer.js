const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const IMAGE_SYSTEM_PROMPT = `You are a prompt improver for AI image generation. Your job is to take the user's prompt and make it clearer and more effective - WITHOUT adding information that wasn't implied.

STRICT RULES:
1. Output in English (translate if needed)
2. DO NOT invent new elements, objects, or details not mentioned or clearly implied
3. DO NOT add dramatic descriptions like "breathtaking", "stunning", "epic" unless the user's intent suggests it
4. DO NOT add technical specs (resolution, aspect ratio)
5. Keep it concise - 1-3 sentences maximum
6. Preserve the user's core intent exactly

WHAT YOU SHOULD DO:
- Translate to English if needed
- Clarify vague descriptions (make them more specific based on context)
- Add basic structure: subject, setting, style (only if implied)
- Improve grammar and flow
- If the user mentions a style or medium, keep it. If not, don't add one.

EXAMPLES:
- "Katze auf Sofa" → "A cat resting on a sofa"
- "futuristische Stadt bei Nacht" → "A futuristic city at night, illuminated by neon lights"
- "Portrait einer älteren Frau, Ölgemälde Stil" → "Portrait of an elderly woman, oil painting style"

OUTPUT: Return ONLY the improved prompt. No explanations, no labels.`;

const VIDEO_SYSTEM_PROMPT = `You are a prompt improver for AI video generation (Veo). Your job is to enhance the user's prompt for better video results - WITHOUT inventing new content.

STRICT RULES:
1. Output in English (translate if needed)
2. DO NOT invent scenes, actions, or elements not mentioned or clearly implied
3. DO NOT add dramatic filler words
4. DO NOT add technical specs (resolution, duration, fps)
5. Keep it concise - 2-4 sentences maximum
6. Preserve the user's core intent exactly

WHAT YOU SHOULD DO:
- Translate to English if needed
- Clarify the motion/action (what moves, how it moves)
- Add camera movement ONLY if it enhances the described scene naturally
- Describe the temporal flow if relevant (gradually, slowly, etc.)
- Keep the mood and setting the user implied

IF AN IMAGE IS PROVIDED:
- Analyze what's in the image
- Understand how the user's text prompt relates to the image
- The image is likely the starting point of the video
- Enhance the prompt to describe how the scene should evolve/animate from that image
- DO NOT describe static elements already visible - focus on what should HAPPEN

OUTPUT: Return ONLY the improved prompt. No explanations, no labels.`;

const VIDEO_WITH_IMAGE_SYSTEM_PROMPT = `You are a prompt improver for AI video generation. The user has provided a starting image and a text prompt. Your job is to understand what video they want to create from this image.

ANALYZE:
1. Look at the image - what's the subject, setting, mood?
2. Read the user's prompt - what do they want to happen?
3. Combine both to create a clear video prompt

STRICT RULES:
1. Output in English
2. DO NOT invent elements not in the image or prompt
3. Focus on MOTION and CHANGE - what should animate/move/happen
4. Keep it concise - 2-4 sentences
5. Don't describe what's already static in the image unless it should change

WHAT YOU SHOULD DO:
- Describe the key action/motion the user wants
- Add natural camera movement if it fits
- Include temporal flow (slowly, gradually, suddenly)
- Keep the mood consistent with the image

OUTPUT: Return ONLY the improved prompt. No explanations.`;

async function enhancePrompt(prompt, type = 'image', imageBase64 = null) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API Key nicht konfiguriert');
  }

  let systemPrompt;
  let contents;

  if (type === 'video' && imageBase64) {
    // Video with start frame - use vision
    systemPrompt = VIDEO_WITH_IMAGE_SYSTEM_PROMPT;
    contents = [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64
            }
          },
          { text: `${systemPrompt}\n\nUser's prompt:\n${prompt}` }
        ]
      }
    ];
  } else {
    // Text only
    systemPrompt = type === 'video' ? VIDEO_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT;
    contents = [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser's prompt:\n${prompt}` }]
      }
    ];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API Fehler');
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
    throw new Error('Keine Antwort von Gemini erhalten');
  }

  return data.candidates[0].content.parts[0].text.trim();
}

module.exports = { enhancePrompt };
