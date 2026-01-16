const API = {
  async generateImage(prompt, model, aspectRatio, referenceImages = [], resolution = null, referenceImageIds = []) {
    const response = await fetch('/api/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, aspectRatio, referenceImages, resolution, referenceImageIds })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler bei der Bildgenerierung');
    }

    return response.json();
  },

  async generateVideo(prompt, model, aspectRatio, startFrame, endFrame, generateAudio, resolution = '720p', duration = 8) {
    const response = await fetch('/api/videos/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, aspectRatio, startFrame, endFrame, generateAudio, resolution, duration })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler bei der Videogenerierung');
    }

    return response.json();
  },

  async checkVideoStatus(id) {
    const response = await fetch(`/api/videos/${id}/status`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Status-Check');
    }

    return response.json();
  },

  async extendVideo(id, model = 'veo-3.1', resolution = '720p') {
    const response = await fetch(`/api/videos/${id}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, resolution })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler bei der Video-Verlängerung');
    }

    return response.json();
  },

  async getHistory(page = 1, limit = 20, type = '') {
    const params = new URLSearchParams({ page, limit });
    if (type) params.append('type', type);

    const response = await fetch(`/api/history?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Laden der History');
    }

    return response.json();
  },

  async deleteGeneration(id) {
    const response = await fetch(`/api/history/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Fehler beim Löschen');
    }

    return response.json();
  },

  getDownloadUrl(id) {
    return `/api/history/${id}/download`;
  }
};
