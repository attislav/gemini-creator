# Google Veo 3.1 API Integrations-Guide

Dieser Guide beschreibt die Nutzung des **Veo 3.1** Modells über die Google Gemini API (Vertex AI / AI Studio) via raw HTTP Requests.

> **Wichtig:** Die Videogenerierung ist **asynchron**. Der Prozess besteht aus **Trigger** (Generierung starten) und **Polling** (Status abfragen).

---

## 1. Basis-Konfiguration

* **Base URL:** `https://generativelanguage.googleapis.com/v1beta`
* **Model:** `veo-3.1-generate-preview` (Namen können variieren, z.B. `-001`)
* **Authentication:** API Key als Query-Parameter `?key=DEIN_API_KEY` oder Header.

---

## 2. Workflow: Video mit Start- & End-Frame

Dies ist der Request für kontrollierte Animationen (Morphing/Interpolation) zwischen zwei Bildern.

### Schritt A: Generierung starten (POST)

**Endpoint:**
`POST /models/veo-3.1-generate-preview:predictLongRunning?key=DEIN_API_KEY`

**Headers:**
```http
Content-Type: application/json

{
  // Der Text-Prompt beschreibt die Bewegung/Veränderung
  "prompt": "Cinematic drone shot moving forward, transition from day to night, cyberpunk style.",

  // START-FRAME: Das erste Bild der Sequenz
  // Muss als Base64-String codiert sein (ohne "data:image/..." Header)
  "image": {
    "imageBytes": "BASE64_STRING_START_IMAGE..."
  },

  "videoGenerationConfig": {
    "aspectRatio": "16:9",
    "durationSeconds": 8,  // Bei Start+End oft fix auf 8s
    "fileFormat": "MP4",
    
    // END-FRAME: Das letzte Bild der Sequenz
    "lastFrame": {
      "imageBytes": "BASE64_STRING_END_IMAGE..."
    }
  }
}

AUDIO

"videoGenerationConfig": {
    "aspectRatio": "16:9",
    "fileFormat": "MP4",
    "generateAudio": true  // <-- Audio AN
}