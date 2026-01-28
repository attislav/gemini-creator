const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const IMAGE_MODELS = {
  'nano-banana': 'gemini-2.5-flash-image',
  'nano-banana-pro': 'gemini-3-pro-image-preview'
};

async function generateImage(prompt, modelAlias, aspectRatio, referenceImages = [], resolution = null) {
  const model = IMAGE_MODELS[modelAlias] || IMAGE_MODELS['nano-banana'];
  const apiKey = process.env.GEMINI_API_KEY;

  const parts = [{ text: prompt }];

  // Füge alle Referenzbilder hinzu
  if (referenceImages && referenceImages.length > 0) {
    for (const imageBase64 of referenceImages) {
      if (imageBase64) {
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: imageBase64
          }
        });
      }
    }
  }

  // Build imageConfig
  const imageConfig = { aspectRatio };

  // Add resolution for Pro model (1K, 2K, 4K) - imageSize directly in imageConfig
  if (modelAlias === 'nano-banana-pro' && resolution) {
    imageConfig.imageSize = resolution;
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig
    }
  };

  // Debug logging
  console.log('[GEMINI] Image Generation Request:');
  console.log('[GEMINI] Model:', model);
  console.log('[GEMINI] Prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
  console.log('[GEMINI] Reference Images:', referenceImages?.length || 0);
  console.log('[GEMINI] Config:', JSON.stringify(requestBody.generationConfig, null, 2));

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('[GEMINI] Image Generation Error:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[GEMINI] Image Generation Success');

  const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);

  if (!imagePart) {
    console.error('[GEMINI] No image data in response:', JSON.stringify(data, null, 2));
    throw new Error('No image data in response');
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png'
  };
}

const VIDEO_MODELS = {
  'veo-3.1': 'veo-3.1-generate-preview',
  'veo-3.1-fast': 'veo-3.1-fast-generate-preview'
};

async function startVideoGeneration(prompt, modelAlias = 'veo-3.1', aspectRatio = '9:16', startFrameBase64 = null, endFrameBase64 = null, generateAudio = true, resolution = '720p', duration = 8) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = VIDEO_MODELS[modelAlias] || VIDEO_MODELS['veo-3.1'];

  // Build instance - exactly like working n8n workflow
  const instance = { prompt };

  // Check if using frames (both work with Veo 3.1 and Fast)
  const hasStartFrame = !!startFrameBase64;
  const hasEndFrame = !!endFrameBase64;
  const hasFrames = hasStartFrame || hasEndFrame;

  // When using frames: force 8 seconds duration (API requirement)
  if (hasFrames && duration !== 8) {
    console.log('[GEMINI] WARNING: Frames require 8 sec duration, adjusting from', duration);
    duration = 8;
  }

  // Start frame (works with both Veo 3.1 and Fast)
  if (startFrameBase64) {
    instance.image = {
      mimeType: 'image/png',
      bytesBase64Encoded: startFrameBase64
    };
  }

  // End frame - lastFrame in instance (works with both Veo 3.1 and Fast)
  if (endFrameBase64) {
    instance.lastFrame = {
      mimeType: 'image/png',
      bytesBase64Encoded: endFrameBase64
    };
  }

  // Build request body
  const requestBody = {
    instances: [instance],
    parameters: {
      durationSeconds: duration,
      aspectRatio
    }
  };

  // personGeneration only for regular Veo 3.1
  if (modelAlias === 'veo-3.1') {
    requestBody.parameters.personGeneration = 'allow_adult';
  }

  // Audio generation (nur Veo 3.1 - Fast unterstützt es nicht)
  if (modelAlias === 'veo-3.1') {
    requestBody.parameters.generateAudio = generateAudio;
  }

  // Debug logging (without base64 data)
  console.log('[GEMINI] Video Generation Request:');
  console.log('[GEMINI] Model:', model);
  console.log('[GEMINI] Prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
  console.log('[GEMINI] Start Frame:', startFrameBase64 ? `${Math.round(startFrameBase64.length / 1024)}KB` : 'none');
  console.log('[GEMINI] End Frame:', endFrameBase64 ? `${Math.round(endFrameBase64.length / 1024)}KB` : 'none');
  const audioStatus = modelAlias === 'veo-3.1' ? (generateAudio ? 'enabled' : 'disabled') : 'not supported';
  console.log('[GEMINI] Aspect:', aspectRatio, '| Duration:', duration, 's | Audio:', audioStatus, '| Resolution:', resolution);

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${model}:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('[GEMINI] Video Generation Error:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[GEMINI] Video Generation Started:', data.name);
  return data.name;
}

async function pollVideoStatus(operationName) {
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(
    `${GEMINI_API_BASE}/${operationName}?key=${apiKey}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();

  console.log('[GEMINI] Poll status - done:', data.done, '| has error:', !!data.error);

  if (data.done) {
    if (data.error) {
      console.error('[GEMINI] Poll error:', data.error.message);
      return {
        done: true,
        success: false,
        error: data.error.message
      };
    }

    // Try new response structure: generateVideoResponse.generatedSamples[].video.uri
    const videoUri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

    if (videoUri) {
      console.log('[GEMINI] Video ready! Downloading from URI...');

      // Download video from URI (needs API key)
      const videoUrl = videoUri.includes('?') ? `${videoUri}&key=${apiKey}` : `${videoUri}?key=${apiKey}`;
      const videoResponse = await fetch(videoUrl);

      if (!videoResponse.ok) {
        console.error('[GEMINI] Failed to download video:', videoResponse.status);
        return {
          done: true,
          success: false,
          error: `Failed to download video: ${videoResponse.status}`
        };
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const base64 = Buffer.from(videoBuffer).toString('base64');

      console.log('[GEMINI] Video downloaded! Size:', Math.round(base64.length / 1024), 'KB');

      return {
        done: true,
        success: true,
        base64: base64,
        mimeType: 'video/mp4'
      };
    }

    // Fallback: try old response structure (predictions)
    const videoData = data.response?.predictions?.[0];
    if (videoData?.bytesBase64Encoded) {
      console.log('[GEMINI] Video ready (legacy format)! Size:', Math.round(videoData.bytesBase64Encoded.length / 1024), 'KB');
      return {
        done: true,
        success: true,
        base64: videoData.bytesBase64Encoded,
        mimeType: videoData.mimeType || 'video/mp4'
      };
    }

    console.error('[GEMINI] No video data found. Response:', JSON.stringify(data.response, null, 2).substring(0, 500));
    return {
      done: true,
      success: false,
      error: 'No video data in response'
    };
  }

  return {
    done: false,
    success: false
  };
}

async function extendVideo(sourceVideoBase64, modelAlias = 'veo-3.1', resolution = '720p') {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = VIDEO_MODELS[modelAlias] || VIDEO_MODELS['veo-3.1'];

  // According to the Reddit post, use 'source' parameter with the video data
  const requestBody = {
    instances: [{
      source: {
        bytesBase64Encoded: sourceVideoBase64,
        mimeType: 'video/mp4'
      }
    }],
    parameters: {
      resolution
    }
  };

  console.log('[GEMINI] Video Extension Request:');
  console.log('[GEMINI] Model:', model);
  console.log('[GEMINI] Resolution:', resolution);
  console.log('[GEMINI] Source video size:', Math.round(sourceVideoBase64.length / 1024), 'KB');

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${model}:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('[GEMINI] Video Extension Error:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[GEMINI] Video Extension Started:', data.name);
  return data.name;
}

module.exports = {
  generateImage,
  startVideoGeneration,
  extendVideo,
  pollVideoStatus,
  IMAGE_MODELS,
  VIDEO_MODELS
};
