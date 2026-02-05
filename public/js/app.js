const App = {
  currentTab: 'image',
  notificationTimeout: null,
  currentZoom: 100,
  zoomLevels: [25, 50, 75, 100, 125, 150, 200, 300, 400],
  historyPickerCallback: null,
  historyPickerPage: 1,

  init() {
    this.bindTabs();
    this.bindModal();
    this.bindZoomControls();
    this.bindHistoryPicker();
    this.bindShutdown();
    PromptHistory.init();
    ImageGenerator.init();
    VideoGenerator.init();
    History.init();

    History.load();
  },

  bindShutdown() {
    const shutdownBtn = document.getElementById('shutdown-btn');
    shutdownBtn.addEventListener('click', () => this.shutdown());
  },

  async shutdown() {
    if (!confirm('Server beenden? Die App wird geschlossen.')) {
      return;
    }

    try {
      await API.shutdown();
      document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0f0f0f; color: white; font-family: system-ui;">
          <h1 style="margin-bottom: 16px;">Server beendet</h1>
          <p style="color: #888;">Du kannst dieses Tab jetzt schließen.</p>
        </div>
      `;
    } catch (error) {
      this.showNotification('Fehler beim Beenden', 'error');
    }
  },

  bindTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`${target}-tab`).classList.add('active');

        this.currentTab = target;

        if (target === 'history') {
          History.load(true);
        }

        PromptHistory.updateVisibility(target);
      });
    });
  },

  bindModal() {
    const modal = document.getElementById('media-modal');
    const backdrop = modal.querySelector('.modal-backdrop');
    const closeBtn = document.getElementById('modal-close');

    backdrop.addEventListener('click', () => this.closeModal());
    closeBtn.addEventListener('click', () => this.closeModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('visible')) {
        this.closeModal();
      }
    });

    // Modal action buttons
    document.getElementById('modal-download').addEventListener('click', () => {
      if (this.currentModalItem) {
        window.location.href = API.getDownloadUrl(this.currentModalItem.id);
      }
    });

    document.getElementById('modal-use-image').addEventListener('click', () => {
      if (this.currentModalItem) {
        this.useAsReferenceImage(this.currentModalItem.file_path);
      }
    });

    document.getElementById('modal-use-video-start').addEventListener('click', () => {
      if (this.currentModalItem) {
        this.useAsVideoFrame(this.currentModalItem.file_path, 'start');
      }
    });

    document.getElementById('modal-use-video-end').addEventListener('click', () => {
      if (this.currentModalItem) {
        this.useAsVideoFrame(this.currentModalItem.file_path, 'end');
      }
    });

    document.getElementById('modal-extend-video').addEventListener('click', () => {
      if (this.currentModalItem && this.currentModalItem.type === 'video') {
        this.extendVideo(this.currentModalItem);
      }
    });

    document.getElementById('modal-use-again').addEventListener('click', () => {
      if (this.currentModalItem) {
        this.useAgain(this.currentModalItem);
      }
    });
  },

  bindZoomControls() {
    const zoomFit = document.getElementById('zoom-fit');
    const zoom100 = document.getElementById('zoom-100');
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const modalImage = document.getElementById('modal-image');

    zoomFit.addEventListener('click', () => this.setZoomMode('fit'));
    zoom100.addEventListener('click', () => this.setZoomMode('100'));
    zoomIn.addEventListener('click', () => this.zoomStep(1));
    zoomOut.addEventListener('click', () => this.zoomStep(-1));

    // Mouse wheel zoom
    document.querySelector('.modal-media').addEventListener('wheel', (e) => {
      if (this.currentModalItem && this.currentModalItem.type !== 'video') {
        e.preventDefault();
        this.zoomStep(e.deltaY < 0 ? 1 : -1);
      }
    }, { passive: false });

    // Double-click to toggle fit/100%
    modalImage.addEventListener('dblclick', () => {
      if (this.currentZoom === 100) {
        this.setZoomMode('fit');
      } else {
        this.setZoomMode('100');
      }
    });
  },

  setZoomMode(mode) {
    const modalContent = document.querySelector('.modal-content');
    const modalImage = document.getElementById('modal-image');
    const zoomLevel = document.getElementById('zoom-level');
    const zoomFit = document.getElementById('zoom-fit');
    const zoom100 = document.getElementById('zoom-100');

    zoomFit.classList.remove('active');
    zoom100.classList.remove('active');

    if (mode === 'fit') {
      modalContent.classList.remove('fullsize');
      modalImage.style.transform = '';
      modalImage.style.width = '';
      modalImage.style.height = '';
      this.currentZoom = 'fit';
      zoomLevel.textContent = 'Passend';
      zoomFit.classList.add('active');
    } else if (mode === '100') {
      modalContent.classList.add('fullsize');
      modalImage.style.transform = '';
      modalImage.style.width = '';
      modalImage.style.height = '';
      this.currentZoom = 100;
      zoomLevel.textContent = '100%';
      zoom100.classList.add('active');
    }
  },

  zoomStep(direction) {
    const modalContent = document.querySelector('.modal-content');
    const modalImage = document.getElementById('modal-image');
    const zoomLevel = document.getElementById('zoom-level');
    const zoomFit = document.getElementById('zoom-fit');
    const zoom100 = document.getElementById('zoom-100');

    // Convert 'fit' to approximate percentage based on image size
    if (this.currentZoom === 'fit') {
      this.currentZoom = 100;
    }

    // Find current index in zoom levels
    let currentIndex = this.zoomLevels.indexOf(this.currentZoom);
    if (currentIndex === -1) {
      // Find closest
      currentIndex = this.zoomLevels.findIndex(z => z >= this.currentZoom);
      if (currentIndex === -1) currentIndex = this.zoomLevels.length - 1;
    }

    // Move to next/prev level
    const newIndex = Math.max(0, Math.min(this.zoomLevels.length - 1, currentIndex + direction));
    this.currentZoom = this.zoomLevels[newIndex];

    // Apply zoom
    modalContent.classList.add('fullsize');
    modalImage.style.width = `${this.currentZoom}%`;
    modalImage.style.height = 'auto';

    zoomLevel.textContent = `${this.currentZoom}%`;
    zoomFit.classList.remove('active');
    zoom100.classList.toggle('active', this.currentZoom === 100);
  },

  currentModalItem: null,

  openModal(item) {
    this.currentModalItem = item;
    const modal = document.getElementById('media-modal');
    const modalContent = document.querySelector('.modal-content');
    const modalImage = document.getElementById('modal-image');
    const modalVideo = document.getElementById('modal-video');
    const modalPrompt = document.getElementById('modal-prompt');
    const modalMeta = document.getElementById('modal-meta');
    const useImageBtn = document.getElementById('modal-use-image');
    const useVideoStartBtn = document.getElementById('modal-use-video-start');
    const useVideoEndBtn = document.getElementById('modal-use-video-end');
    const extendVideoBtn = document.getElementById('modal-extend-video');
    const zoomControls = document.getElementById('zoom-controls');

    const isVideo = item.type === 'video';
    const isCompletedVideo = isVideo && item.status === 'completed';
    const date = new Date(item.created_at).toLocaleString('de-DE');

    // Reset zoom state
    modalContent.classList.remove('fullsize');
    modalImage.style.width = '';
    modalImage.style.height = '';
    modalImage.style.transform = '';
    this.currentZoom = 'fit';
    document.getElementById('zoom-level').textContent = 'Passend';
    document.getElementById('zoom-fit').classList.add('active');
    document.getElementById('zoom-100').classList.remove('active');

    modalImage.hidden = isVideo;
    modalVideo.hidden = !isVideo;
    zoomControls.hidden = isVideo;

    if (isVideo) {
      modalVideo.src = item.file_path;
      useImageBtn.hidden = true;
      useVideoStartBtn.hidden = true;
      useVideoEndBtn.hidden = true;
      extendVideoBtn.hidden = !isCompletedVideo;
    } else {
      modalImage.src = item.file_path;
      useImageBtn.hidden = false;
      useVideoStartBtn.hidden = false;
      useVideoEndBtn.hidden = false;
      extendVideoBtn.hidden = true;
    }

    modalPrompt.textContent = item.prompt;
    modalMeta.textContent = `${item.type === 'video' ? 'Video' : 'Bild'} | ${item.model} | ${item.aspect_ratio} | ${date}`;

    modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    const modal = document.getElementById('media-modal');
    const modalContent = document.querySelector('.modal-content');
    const modalVideo = document.getElementById('modal-video');
    const modalImage = document.getElementById('modal-image');

    modalVideo.pause();
    modal.classList.remove('visible');
    modalContent.classList.remove('fullsize');
    modalImage.style.width = '';
    modalImage.style.height = '';
    document.body.style.overflow = '';
    this.currentModalItem = null;
  },

  async useAsReferenceImage(imagePath) {
    try {
      const response = await fetch(imagePath);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        ImageGenerator.addImageFromUrl(e.target.result, base64);
        this.closeModal();
        this.switchToTab('image');
        this.showNotification('Bild als Referenz hinzugefügt', 'success');
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      this.showNotification('Fehler beim Laden des Bildes', 'error');
    }
  },

  async useAsVideoFrame(imagePath, frameType) {
    try {
      const response = await fetch(imagePath);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        VideoGenerator.setFrameFromUrl(e.target.result, base64, frameType);
        this.closeModal();
        this.switchToTab('video');
        this.showNotification(`Bild als ${frameType === 'start' ? 'Start' : 'End'}-Frame gesetzt`, 'success');
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      this.showNotification('Fehler beim Laden des Bildes', 'error');
    }
  },

  switchToTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));

    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    this.currentTab = tabName;
  },

  bindHistoryPicker() {
    const pickerModal = document.getElementById('history-picker-modal');
    const backdrop = pickerModal.querySelector('.modal-backdrop');
    const closeBtn = document.getElementById('picker-close');
    const loadMoreBtn = document.getElementById('picker-load-more');

    backdrop.addEventListener('click', () => this.closeHistoryPicker());
    closeBtn.addEventListener('click', () => this.closeHistoryPicker());
    loadMoreBtn.addEventListener('click', () => this.loadMorePickerItems());
  },

  async openHistoryPicker(type, callback) {
    this.historyPickerCallback = callback;
    this.historyPickerPage = 1;

    const pickerModal = document.getElementById('history-picker-modal');
    const pickerGrid = document.getElementById('picker-grid');
    const pickerEmpty = document.getElementById('picker-empty');
    const loadMoreBtn = document.getElementById('picker-load-more');

    pickerGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Lade...</p>';
    pickerEmpty.hidden = true;
    loadMoreBtn.hidden = true;

    pickerModal.classList.add('visible');
    document.body.style.overflow = 'hidden';

    try {
      const data = await API.getHistory(1, 30, type);
      this.renderPickerItems(data.items, false);

      if (data.items.length === 0) {
        pickerEmpty.hidden = false;
      }

      if (data.hasMore) {
        loadMoreBtn.hidden = false;
      }
    } catch (error) {
      pickerGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--error);">Fehler beim Laden</p>';
    }
  },

  async loadMorePickerItems() {
    this.historyPickerPage++;
    const loadMoreBtn = document.getElementById('picker-load-more');
    loadMoreBtn.textContent = 'Lade...';
    loadMoreBtn.disabled = true;

    try {
      const data = await API.getHistory(this.historyPickerPage, 30, 'image');
      this.renderPickerItems(data.items, true);

      loadMoreBtn.textContent = 'Mehr laden';
      loadMoreBtn.disabled = false;
      loadMoreBtn.hidden = !data.hasMore;
    } catch (error) {
      loadMoreBtn.textContent = 'Mehr laden';
      loadMoreBtn.disabled = false;
    }
  },

  renderPickerItems(items, append) {
    const pickerGrid = document.getElementById('picker-grid');

    if (!append) {
      pickerGrid.innerHTML = '';
    }

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'picker-item';
      div.innerHTML = `<img src="${item.file_path}" alt="${item.prompt}">`;

      div.addEventListener('click', async () => {
        // Fetch the image and convert to base64
        try {
          const response = await fetch(item.file_path);
          const blob = await response.blob();
          const reader = new FileReader();

          reader.onload = (e) => {
            const dataUrl = e.target.result;
            const base64 = dataUrl.split(',')[1];

            if (this.historyPickerCallback) {
              // Pass item ID for "Use again" feature
              this.historyPickerCallback(dataUrl, base64, item.id);
            }

            this.closeHistoryPicker();
            this.showNotification('Bild ausgewählt', 'success');
          };

          reader.readAsDataURL(blob);
        } catch (error) {
          this.showNotification('Fehler beim Laden des Bildes', 'error');
        }
      });

      pickerGrid.appendChild(div);
    });
  },

  closeHistoryPicker() {
    const pickerModal = document.getElementById('history-picker-modal');
    pickerModal.classList.remove('visible');
    document.body.style.overflow = '';
    this.historyPickerCallback = null;
  },

  async useAgain(item) {
    // Parse input settings if available
    let settings = {};
    if (item.input_settings) {
      try {
        settings = JSON.parse(item.input_settings);
      } catch (e) {
        console.error('Failed to parse input_settings:', e);
      }
    }

    // Fallback to basic item properties
    const prompt = settings.prompt || item.prompt;
    const model = settings.model || item.model;
    const aspectRatio = settings.aspectRatio || item.aspect_ratio;

    this.closeModal();

    if (item.type === 'image') {
      // Switch to image tab
      this.switchToTab('image');

      // Clear existing reference images first
      ImageGenerator.clearReferenceImages();

      // Fill in the form
      document.getElementById('image-prompt').value = prompt;
      document.getElementById('image-model').value = model;
      document.getElementById('image-aspect').value = aspectRatio;

      // Set resolution if available and Pro model
      if (settings.resolution && model === 'nano-banana-pro') {
        document.getElementById('image-resolution').value = settings.resolution;
        document.getElementById('resolution-group').hidden = false;
      }

      // Try to restore reference images from history IDs
      const refIds = settings.referenceImageIds || [];
      if (refIds.length > 0) {
        this.showNotification('Lade Referenzbilder...', 'info');

        let loadedCount = 0;
        for (const id of refIds) {
          const success = await ImageGenerator.addImageFromHistoryId(id);
          if (success) loadedCount++;
        }

        if (loadedCount === refIds.length) {
          this.showNotification(`Einstellungen geladen mit ${loadedCount} Referenzbild(ern)`, 'success');
        } else if (loadedCount > 0) {
          this.showNotification(`${loadedCount} von ${refIds.length} Referenzbildern geladen`, 'info');
        } else {
          this.showNotification('Einstellungen geladen (Referenzbilder nicht mehr verfügbar)', 'info');
        }
      } else if (settings.referenceImageCount > 0) {
        // Old entries without IDs
        this.showNotification(`Einstellungen geladen (${settings.referenceImageCount} Referenzbild(er) waren nicht aus History)`, 'info');
      } else {
        this.showNotification('Einstellungen geladen', 'success');
      }
    } else if (item.type === 'video') {
      // Switch to video tab
      this.switchToTab('video');

      // Fill in the form
      document.getElementById('video-prompt').value = prompt;
      document.getElementById('video-model').value = model;
      document.getElementById('video-aspect').value = aspectRatio;

      // Set additional video settings
      if (settings.resolution) {
        document.getElementById('video-resolution').value = settings.resolution;
      }
      if (settings.duration) {
        document.getElementById('video-duration').value = settings.duration;
      }
      if (typeof settings.generateAudio === 'boolean') {
        document.getElementById('video-audio').checked = settings.generateAudio;
      }

      // Note about frames
      let message = 'Einstellungen geladen';
      if (settings.hasStartFrame || settings.hasEndFrame) {
        message += ' (Start/End-Frames können nicht wiederhergestellt werden)';
        this.showNotification(message, 'info');
      } else {
        this.showNotification(message, 'success');
      }
    }
  },

  async extendVideo(videoItem) {
    // Close modal and switch to video tab
    this.closeModal();
    this.switchToTab('video');

    // Use the model from the original video or default
    const model = videoItem.model || 'veo-3.1';
    // Extract resolution from aspect_ratio if stored, otherwise default to 720p
    const resolution = '720p';

    this.showNotification('Video-Verlängerung wird gestartet...', 'info');

    try {
      const result = await API.extendVideo(videoItem.id, model, resolution);

      // Use VideoGenerator's polling mechanism
      VideoGenerator.currentGeneration = result;
      VideoGenerator.statusArea.hidden = false;
      VideoGenerator.resultArea.hidden = true;
      VideoGenerator.progressBar.style.width = '5%';
      VideoGenerator.statusText.textContent = 'Video wird verlängert...';
      VideoGenerator.setLoading(true);
      VideoGenerator.startPolling(result.id);

      this.showNotification('Video-Verlängerung gestartet!', 'success');
    } catch (error) {
      this.showNotification(error.message, 'error');
    }
  },

  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.hidden = false;

    this.notificationTimeout = setTimeout(() => {
      notification.hidden = true;
    }, 4000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
