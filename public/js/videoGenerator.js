const VideoGenerator = {
  form: null,
  promptInput: null,
  modelSelect: null,
  aspectSelect: null,
  resolutionSelect: null,
  durationSelect: null,
  audioCheckbox: null,
  startFrameInput: null,
  startFramePreview: null,
  endFrameInput: null,
  endFramePreview: null,
  frameWarning: null,
  submitButton: null,
  statusArea: null,
  progressBar: null,
  statusText: null,
  resultArea: null,
  generatedVideo: null,
  downloadButton: null,
  currentGeneration: null,
  startFrameBase64: null,
  endFrameBase64: null,
  pollingInterval: null,
  historyPickerCallback: null,

  init() {
    this.form = document.getElementById('video-form');
    this.promptInput = document.getElementById('video-prompt');
    this.modelSelect = document.getElementById('video-model');
    this.aspectSelect = document.getElementById('video-aspect');
    this.resolutionSelect = document.getElementById('video-resolution');
    this.durationSelect = document.getElementById('video-duration');
    this.audioCheckbox = document.getElementById('video-audio');
    this.startFrameInput = document.getElementById('start-frame');
    this.startFramePreview = document.getElementById('start-frame-preview');
    this.endFrameInput = document.getElementById('end-frame');
    this.endFramePreview = document.getElementById('end-frame-preview');
    this.frameWarning = document.getElementById('frame-warning');
    this.submitButton = document.getElementById('generate-video-btn');
    this.statusArea = document.getElementById('video-status');
    this.progressBar = document.getElementById('video-progress');
    this.statusText = document.getElementById('status-text');
    this.resultArea = document.getElementById('video-result');
    this.generatedVideo = document.getElementById('generated-video');
    this.downloadButton = document.getElementById('download-video');

    this.bindEvents();
  },

  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    this.setupUploadArea('start-frame-area', this.startFrameInput, this.startFramePreview, 'clear-start-frame', 'start');
    this.setupUploadArea('end-frame-area', this.endFrameInput, this.endFramePreview, 'clear-end-frame', 'end');

    this.downloadButton.addEventListener('click', () => this.downloadVideo());

    // History picker buttons
    document.getElementById('pick-start-frame').addEventListener('click', () => {
      this.openHistoryPicker('start');
    });
    document.getElementById('pick-end-frame').addEventListener('click', () => {
      this.openHistoryPicker('end');
    });
  },

  openHistoryPicker(frameType) {
    App.openHistoryPicker('image', (dataUrl, base64) => {
      this.setFrameFromUrl(dataUrl, base64, frameType);
    });
  },

  updateFrameWarning() {
    if (this.frameWarning) {
      this.frameWarning.hidden = !(this.endFrameBase64 && !this.startFrameBase64);
    }
  },

  setupUploadArea(areaId, input, preview, clearId, type) {
    const area = document.getElementById(areaId);
    const clearBtn = document.getElementById(clearId);

    area.addEventListener('click', () => input.click());

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadFrame(file, preview, clearBtn, area, type);
      }
    });

    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.style.borderColor = 'var(--accent)';
    });

    area.addEventListener('dragleave', () => {
      area.style.borderColor = '';
    });

    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.loadFrame(file, preview, clearBtn, area, type);
      }
    });

    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearFrame(input, preview, clearBtn, area, type);
    });
  },

  loadFrame(file, preview, clearBtn, area, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(',')[1];

      if (type === 'start') {
        this.startFrameBase64 = base64;
      } else {
        this.endFrameBase64 = base64;
      }

      preview.src = dataUrl;
      preview.hidden = false;
      clearBtn.hidden = false;
      area.querySelector('.upload-placeholder').hidden = true;
      this.updateFrameWarning();
    };
    reader.readAsDataURL(file);
  },

  // Set frame from URL (used by modal and history picker)
  setFrameFromUrl(dataUrl, base64, frameType) {
    const areaId = frameType === 'start' ? 'start-frame-area' : 'end-frame-area';
    const area = document.getElementById(areaId);
    const preview = frameType === 'start' ? this.startFramePreview : this.endFramePreview;
    const clearBtn = document.getElementById(frameType === 'start' ? 'clear-start-frame' : 'clear-end-frame');

    if (frameType === 'start') {
      this.startFrameBase64 = base64;
    } else {
      this.endFrameBase64 = base64;
    }

    preview.src = dataUrl;
    preview.hidden = false;
    clearBtn.hidden = false;
    area.querySelector('.upload-placeholder').hidden = true;
    this.updateFrameWarning();
  },

  clearFrame(input, preview, clearBtn, area, type) {
    if (type === 'start') {
      this.startFrameBase64 = null;
    } else {
      this.endFrameBase64 = null;
    }

    input.value = '';
    preview.hidden = true;
    clearBtn.hidden = true;
    area.querySelector('.upload-placeholder').hidden = false;
    this.updateFrameWarning();
  },

  async handleSubmit(e) {
    e.preventDefault();

    const prompt = this.promptInput.value.trim();
    const model = this.modelSelect.value;
    const aspectRatio = this.aspectSelect.value;
    const resolution = this.resolutionSelect.value;
    const duration = parseInt(this.durationSelect.value, 10);
    const generateAudio = this.audioCheckbox.checked;

    if (!prompt) {
      App.showNotification('Bitte gib einen Prompt ein', 'error');
      return;
    }

    // End-Frame requires Start-Frame
    if (this.endFrameBase64 && !this.startFrameBase64) {
      App.showNotification('End-Frame benötigt auch ein Start-Frame!', 'error');
      return;
    }

    this.setLoading(true);
    this.statusArea.hidden = false;
    this.resultArea.hidden = true;
    this.progressBar.style.width = '5%';
    this.statusText.textContent = 'Video wird gestartet...';

    try {
      const result = await API.generateVideo(
        prompt,
        model,
        aspectRatio,
        this.startFrameBase64,
        this.endFrameBase64,
        generateAudio,
        resolution,
        duration
      );

      this.currentGeneration = result;
      this.startPolling(result.id);
    } catch (error) {
      App.showNotification(error.message, 'error');
      this.setLoading(false);
      this.statusArea.hidden = true;
    }
  },

  startPolling(id) {
    let progress = 10;
    const startTime = Date.now();

    this.pollingInterval = setInterval(async () => {
      try {
        const status = await API.checkVideoStatus(id);

        if (status.status === 'completed') {
          this.stopPolling();
          this.progressBar.style.width = '100%';
          this.statusText.textContent = 'Fertig!';
          this.currentGeneration = status;
          this.generatedVideo.src = status.file_path;
          this.resultArea.hidden = false;
          this.setLoading(false);
          App.showNotification('Video erfolgreich generiert!', 'success');
        } else if (status.status === 'failed') {
          this.stopPolling();
          this.setLoading(false);
          this.statusArea.hidden = true;
          App.showNotification(status.error_message || 'Videogenerierung fehlgeschlagen', 'error');
        } else {
          const elapsed = (Date.now() - startTime) / 1000;
          progress = Math.min(90, 10 + (elapsed / 180) * 80);
          this.progressBar.style.width = `${progress}%`;
          this.statusText.textContent = `Verarbeite... (${Math.round(elapsed)}s)`;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);
  },

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  },

  setLoading(loading) {
    this.submitButton.disabled = loading;
    this.submitButton.querySelector('.btn-text').hidden = loading;
    this.submitButton.querySelector('.btn-loading').hidden = !loading;
  },

  downloadVideo() {
    if (this.currentGeneration) {
      window.location.href = API.getDownloadUrl(this.currentGeneration.id);
    }
  }
};
