# Google Gemini API - HTTP Request Reference

Diese Dokumentation beschreibt die HTTP-Requests für **Nano Banana** (Bildgenerierung) und **Veo 3.1** (Videogenerierung).

## Modellübersicht

| Alias | Offizieller Modellname | Funktion |
|-------|------------------------|----------|
| **Nano Banana** | `gemini-2.5-flash-image` | Bildgenerierung (Standard) |
| **Nano Banana Pro** | `gemini-3-pro-image-preview` | Bildgenerierung (Pro) |
| **Veo 3.1** | `veo-3.1-generate-preview` | Videogenerierung |

---

## Authentifizierung

API-Key von [Google AI Studio](https://aistudio.google.com/) erforderlich.

```
GEMINI_API_KEY=your_api_key_here
```

---

## 1. Nano Banana - Bildgenerierung (Text-to-Image)

### Endpoint

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={API_KEY}
```

Für Pro-Version:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key={API_KEY}
```

### Request Headers

```
Content-Type: application/json
```

### Request Body

```json
{
  "contents": [
    {
      "parts": [
        { "text": "A futuristic city at sunset with flying cars, 9:16 portrait format, photorealistic" }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {
      "aspectRatio": "9:16"
    }
  }
}
```

### cURL Beispiel

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [
          { "text": "A cozy kitchen with morning sunlight, 9:16 portrait format, photorealistic" }
        ]
      }
    ],
    "generationConfig": {
      "responseModalities": ["IMAGE"],
      "imageConfig": {
        "aspectRatio": "9:16"
      }
    }
  }'
```

### Response

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "inlineData": {
              "mimeType": "image/png",
              "data": "BASE64_ENCODED_IMAGE_DATA..."
            }
          }
        ]
      }
    }
  ]
}
```

### Bild extrahieren

```typescript
const data = await response.json();
const parts = data.candidates?.[0]?.content?.parts || [];
const imagePart = parts.find((p) => p.inlineData?.data);
const imageBase64 = imagePart.inlineData.data;
const mimeType = imagePart.inlineData.mimeType; // "image/png"
const imageUrl = `data:${mimeType};base64,${imageBase64}`;
```

---

## 2. Nano Banana - Bildbearbeitung (Image-to-Image)

Verwende ein Referenzbild, um ein ähnliches Bild mit Änderungen zu generieren.

### Request Body

```json
{
  "contents": [
    {
      "parts": [
        { "text": "Transform this room to show it before renovation, same exact perspective" },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "BASE64_ENCODED_REFERENCE_IMAGE"
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {
      "aspectRatio": "9:16"
    }
  }
}
```

### cURL Beispiel

```bash
# Zuerst Bild zu Base64 konvertieren
IMAGE_BASE64=$(base64 -w 0 reference.jpg)

curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [
      {
        \"parts\": [
          { \"text\": \"Show this kitchen before renovation, old and worn, same perspective\" },
          {
            \"inline_data\": {
              \"mime_type\": \"image/jpeg\",
              \"data\": \"$IMAGE_BASE64\"
            }
          }
        ]
      }
    ],
    \"generationConfig\": {
      \"responseModalities\": [\"IMAGE\"],
      \"imageConfig\": {
        \"aspectRatio\": \"9:16\"
      }
    }
  }"
```

---

## 3. Veo 3.1 - Videogenerierung

Videogenerierung ist **asynchron** - der Request startet eine Operation, die gepollt werden muss.

### Endpoint

```
POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning?key={API_KEY}
```

### Request Body (Text-to-Video)

```json
{
  "instances": [
    {
      "prompt": "Time-lapse of clouds moving over mountains at golden hour"
    }
  ],
  "parameters": {
    "aspectRatio": "9:16",
    "durationSeconds": 8,
    "numberOfVideos": 1,
    "generateAudio": true
  }
}
```

### Request Body (Image-to-Video mit Start- und Endbild)

```json
{
  "instances": [
    {
      "prompt": "Smooth transition from before to after, construction time-lapse",
      "image": {
        "bytesBase64Encoded": "BASE64_FIRST_FRAME"
      },
      "endImage": {
        "bytesBase64Encoded": "BASE64_LAST_FRAME"
      }
    }
  ],
  "parameters": {
    "aspectRatio": "9:16",
    "durationSeconds": 8,
    "numberOfVideos": 1,
    "generateAudio": true
  }
}
```

### cURL Beispiel

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [
      {
        "prompt": "A timelapse of a flower blooming in morning light"
      }
    ],
    "parameters": {
      "aspectRatio": "9:16",
      "durationSeconds": 8,
      "numberOfVideos": 1,
      "generateAudio": true
    }
  }'
```

### Response (Operation gestartet)

```json
{
  "name": "operations/abc123xyz-operation-id",
  "metadata": {
    "@type": "type.googleapis.com/..."
  }
}
```

---

## 4. Veo 3.1 - Status Polling

### Endpoint

```
GET https://generativelanguage.googleapis.com/v1beta/{operation_name}?key={API_KEY}
```

### cURL Beispiel

```bash
curl -X GET \
  "https://generativelanguage.googleapis.com/v1beta/operations/abc123xyz-operation-id?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json"
```

### Response (In Bearbeitung)

```json
{
  "name": "operations/abc123xyz-operation-id",
  "done": false,
  "metadata": { }
}
```

### Response (Fertig)

```json
{
  "name": "operations/abc123xyz-operation-id",
  "done": true,
  "response": {
    "predictions": [
      {
        "bytesBase64Encoded": "BASE64_VIDEO_DATA",
        "mimeType": "video/mp4"
      }
    ]
  }
}
```

### Response (Fehler)

```json
{
  "name": "operations/abc123xyz-operation-id",
  "done": true,
  "error": {
    "code": 400,
    "message": "Video generation failed: content policy violation"
  }
}
```

---

## 5. Parameter Referenz

### Bildgenerierung (Nano Banana)

| Parameter | Werte | Beschreibung |
|-----------|-------|--------------|
| `responseModalities` | `["IMAGE"]` | Muss auf IMAGE gesetzt sein |
| `aspectRatio` | `"1:1"`, `"3:4"`, `"4:3"`, `"9:16"`, `"16:9"` | Seitenverhältnis |

### Videogenerierung (Veo 3.1)

| Parameter | Werte | Beschreibung |
|-----------|-------|--------------|
| `aspectRatio` | `"9:16"`, `"16:9"` | Seitenverhältnis |
| `durationSeconds` | `8` | Videolänge (Veo 3.1 fix auf 8s) |
| `numberOfVideos` | `1-4` | Anzahl Videos |
| `generateAudio` | `true/false` | Audio generieren |

---

## 6. TypeScript Implementierung (aus dieser App)

```typescript
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Bild generieren
async function generateImageGemini(prompt: string): Promise<string> {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '9:16' }
        }
      }),
    }
  );

  const data = await response.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.data
  );

  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

// Video generieren
async function generateVideoGemini(
  prompt: string,
  firstFrameBase64: string,
  lastFrameBase64?: string
): Promise<string> {
  // 1. Video-Generation starten
  const response = await fetch(
    `${GEMINI_API_BASE}/models/veo-3.1-generate-preview:predictLongRunning?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{
          prompt,
          image: { bytesBase64Encoded: firstFrameBase64 },
          ...(lastFrameBase64 && { endImage: { bytesBase64Encoded: lastFrameBase64 } }),
        }],
        parameters: {
          aspectRatio: '9:16',
          durationSeconds: 8,
          numberOfVideos: 1,
          generateAudio: true,
        },
      }),
    }
  );

  const { name: operationName } = await response.json();

  // 2. Polling bis fertig
  while (true) {
    const statusResponse = await fetch(
      `${GEMINI_API_BASE}/${operationName}?key=${process.env.GEMINI_API_KEY}`
    );
    const status = await statusResponse.json();

    if (status.done) {
      if (status.error) throw new Error(status.error.message);
      const videoData = status.response?.predictions?.[0];
      return `data:video/mp4;base64,${videoData.bytesBase64Encoded}`;
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // 5s warten
  }
}
```

---

## 7. Fehlerbehandlung

| HTTP Status | Bedeutung |
|-------------|-----------|
| `200` | Erfolg |
| `400` | Ungültiger Request (z.B. fehlende Parameter) |
| `401` | Ungültiger API-Key |
| `403` | Content Policy Violation |
| `429` | Rate Limit erreicht |
| `500` | Server Error |

---

## Quellen

- [Gemini API Dokumentation](https://ai.google.dev/gemini-api/docs)
- [Imagen Dokumentation](https://ai.google.dev/gemini-api/docs/imagen)
- [Veo 3.1 Dokumentation](https://ai.google.dev/gemini-api/docs/video)
- Implementierung: `src/lib/gemini.ts` in dieser App
