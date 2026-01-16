const ImageGenerator = {
  form: null,
  promptInput: null,
  modelSelect: null,
  aspectSelect: null,
  resolutionGroup: null,
  resolutionSelect: null,
  countSelect: null,
  imagesContainer: null,
  addImageButton: null,
  helpToggle: null,
  helpContent: null,
  submitButton: null,
  resultArea: null,
  resultGrid: null,
  resultCount: null,
  downloadAllButton: null,
  currentGenerations: [],
  referenceImages: [],      // Base64 data
  referenceImageIds: [],    // History IDs (if from history)
  maxImages: 5,

  init() {
    this.form = document.getElementById('image-form');
    this.promptInput = document.getElementById('image-prompt');
    this.modelSelect = document.getElementById('image-model');
    this.aspectSelect = document.getElementById('image-aspect');
    this.resolutionGroup = document.getElementById('resolution-group');
    this.resolutionSelect = document.getElementById('image-resolution');
    this.countSelect = document.getElementById('image-count');
    this.imagesContainer = document.getElementById('reference-images-container');
    this.addImageButton = document.getElementById('add-reference-image');
    this.helpToggle = document.getElementById('help-toggle');
    this.helpContent = document.getElementById('help-content');
    this.submitButton = document.getElementById('generate-image-btn');
    this.resultArea = document.getElementById('image-result');
    this.resultGrid = document.getElementById('result-grid');
    this.resultCount = document.getElementById('result-count');
    this.downloadAllButton = document.getElementById('download-all-images');

    this.bindEvents();
  },

  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.addImageButton.addEventListener('click', () => this.addImageSlot());
    this.helpToggle.addEventListener('click', () => this.toggleHelp());
    this.downloadAllButton.addEventListener('click', () => this.downloadAllImages());
    this.modelSelect.addEventListener('change', () => this.onModelChange());

    // History picker for reference images
    document.getElementById('pick-reference-image').addEventListener('click', () => {
      this.openHistoryPicker();
    });
  },

  openHistoryPicker() {
    App.openHistoryPicker('image', (dataUrl, base64, historyId) => {
      this.addImageFromUrl(dataUrl, base64, historyId);
    });
  },

  onModelChange() {
    const isPro = this.modelSelect.value === 'nano-banana-pro';
    this.resolutionGroup.hidden = !isPro;
  },

  toggleHelp() {
    this.helpContent.hidden = !this.helpContent.hidden;
  },

  addImageSlot() {
    if (this.referenceImages.length >= this.maxImages) {
      App.showNotification(`Maximal ${this.maxImages} Bilder erlaubt`, 'error');
      return;
    }

    const index = this.referenceImages.length;
    const slot = document.createElement('div');
    slot.className = 'multi-upload-item';
    slot.dataset.index = index;

    slot.innerHTML = `
      <input type="file" accept="image/*">
      <div class="upload-placeholder">
        <span class="image-number">${index + 1}</span>
        <span class="upload-hint">Bild ${index + 1}</span>
      </div>
      <img class="upload-preview" hidden>
      <button type="button" class="clear-upload" hidden>X</button>
    `;

    const input = slot.querySelector('input');
    const preview = slot.querySelector('.upload-preview');
    const placeholder = slot.querySelector('.upload-placeholder');
    const clearBtn = slot.querySelector('.clear-upload');

    slot.addEventListener('click', (e) => {
      if (e.target !== clearBtn) {
        input.click();
      }
    });

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadImage(file, index, preview, placeholder, clearBtn, slot);
      }
    });

    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.style.borderColor = 'var(--accent)';
    });

    slot.addEventListener('dragleave', () => {
      slot.style.borderColor = '';
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.loadImage(file, index, preview, placeholder, clearBtn, slot);
      }
    });

    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeImageSlot(index, slot);
    });

    this.imagesContainer.appendChild(slot);
    this.referenceImages.push(null);
    this.referenceImageIds.push(null);
    this.updateAddButton();

    return { slot, preview, placeholder, clearBtn, index };
  },

  addImageFromUrl(dataUrl, base64, historyId = null) {
    if (this.referenceImages.length >= this.maxImages) {
      App.showNotification(`Maximal ${this.maxImages} Bilder erlaubt`, 'error');
      return;
    }

    const { slot, preview, placeholder, clearBtn, index } = this.addImageSlot();

    this.referenceImages[index] = base64;
    this.referenceImageIds[index] = historyId;
    preview.src = dataUrl;
    preview.hidden = false;
    placeholder.hidden = true;
    clearBtn.hidden = false;
    slot.classList.add('has-image');
  },

  // Load reference image by history ID (for "Use again" feature)
  async addImageFromHistoryId(historyId) {
    if (this.referenceImages.length >= this.maxImages) {
      return false;
    }

    try {
      // Get item details by ID
      const response = await fetch(`/api/history/${historyId}`);
      if (!response.ok) {
        console.error('Reference image not found:', historyId);
        return false;
      }

      const item = await response.json();

      // Fetch the image file
      const imgResponse = await fetch(item.file_path);
      const blob = await imgResponse.blob();

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          const base64 = dataUrl.split(',')[1];
          this.addImageFromUrl(dataUrl, base64, historyId);
          resolve(true);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to load reference image:', error);
    }
    return false;
  },

  loadImage(file, index, preview, placeholder, clearBtn, slot) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.referenceImages[index] = dataUrl.split(',')[1];
      preview.src = dataUrl;
      preview.hidden = false;
      placeholder.hidden = true;
      clearBtn.hidden = false;
      slot.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  },

  removeImageSlot(index, slot) {
    slot.remove();
    this.referenceImages.splice(index, 1);
    this.referenceImageIds.splice(index, 1);
    this.renumberSlots();
    this.updateAddButton();
  },

  // Clear all reference images
  clearReferenceImages() {
    this.imagesContainer.innerHTML = '';
    this.referenceImages = [];
    this.referenceImageIds = [];
    this.updateAddButton();
  },

  // Get valid reference image IDs (for saving)
  getValidReferenceImageIds() {
    return this.referenceImageIds.filter(id => id !== null);
  },

  renumberSlots() {
    const slots = this.imagesContainer.querySelectorAll('.multi-upload-item');
    slots.forEach((slot, i) => {
      slot.dataset.index = i;
      const numberSpan = slot.querySelector('.image-number');
      const hintSpan = slot.querySelector('.upload-hint');
      if (numberSpan) numberSpan.textContent = i + 1;
      if (hintSpan) hintSpan.textContent = `Bild ${i + 1}`;
    });
  },

  updateAddButton() {
    this.addImageButton.disabled = this.referenceImages.length >= this.maxImages;
    if (this.referenceImages.length >= this.maxImages) {
      this.addImageButton.textContent = `Maximum erreicht (${this.maxImages})`;
    } else {
      this.addImageButton.textContent = `+ Bild hinzufügen (${this.referenceImages.length}/${this.maxImages})`;
    }
  },

  async handleSubmit(e) {
    e.preventDefault();

    const prompt = this.promptInput.value.trim();
    const model = this.modelSelect.value;
    const aspectRatio = this.aspectSelect.value;
    const resolution = model === 'nano-banana-pro' ? this.resolutionSelect.value : null;
    const count = parseInt(this.countSelect.value, 10);

    if (!prompt) {
      App.showNotification('Bitte gib einen Prompt ein', 'error');
      return;
    }

    const validImages = this.referenceImages.filter(img => img !== null);
    const validImageIds = this.getValidReferenceImageIds();

    this.setLoading(true);
    this.currentGenerations = [];
    this.resultArea.hidden = false;

    // Show progress UI
    this.showBatchProgress(count);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < count; i++) {
      this.updateBatchProgress(i, 'active');

      try {
        const result = await API.generateImage(prompt, model, aspectRatio, validImages, resolution, validImageIds);
        this.currentGenerations.push(result);
        this.updateBatchProgress(i, 'completed');
        successCount++;
      } catch (error) {
        console.error(`Image ${i + 1} failed:`, error);
        this.updateBatchProgress(i, 'error');
        errorCount++;
      }
    }

    // Show results
    this.displayResults();
    this.setLoading(false);

    if (successCount > 0 && errorCount === 0) {
      App.showNotification(`${successCount} Bild${successCount > 1 ? 'er' : ''} erfolgreich generiert!`, 'success');
    } else if (successCount > 0 && errorCount > 0) {
      App.showNotification(`${successCount} von ${count} Bildern generiert (${errorCount} fehlgeschlagen)`, 'success');
    } else {
      App.showNotification('Alle Generierungen fehlgeschlagen', 'error');
    }
  },

  showBatchProgress(count) {
    this.resultGrid.innerHTML = `
      <div class="batch-progress" style="grid-column: 1 / -1;">
        <p class="progress-text">Generiere Bilder...</p>
        <div class="progress-dots">
          ${Array(count).fill(0).map((_, i) => `<div class="dot" data-index="${i}"></div>`).join('')}
        </div>
      </div>
    `;
    this.resultCount.textContent = '';
  },

  updateBatchProgress(index, status) {
    const dot = this.resultGrid.querySelector(`.dot[data-index="${index}"]`);
    if (dot) {
      dot.classList.remove('active', 'completed', 'error');
      dot.classList.add(status);
    }

    const progressText = this.resultGrid.querySelector('.progress-text');
    if (progressText && status === 'active') {
      progressText.textContent = `Generiere Bild ${index + 1}...`;
    }
  },

  displayResults() {
    if (this.currentGenerations.length === 0) {
      this.resultGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">Keine Bilder generiert</p>';
      return;
    }

    this.resultCount.textContent = `(${this.currentGenerations.length})`;

    // Add single-item class for single image
    this.resultGrid.classList.toggle('single-item', this.currentGenerations.length === 1);

    this.resultGrid.innerHTML = this.currentGenerations.map((gen, i) => `
      <div class="result-grid-item" data-index="${i}">
        <img src="${gen.file_path}" alt="Generiertes Bild ${i + 1}">
        <div class="item-actions">
          <button class="btn-icon" data-action="download" data-index="${i}" title="Download">⬇</button>
        </div>
      </div>
    `).join('');

    // Bind click events
    this.resultGrid.querySelectorAll('.result-grid-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.item-actions')) return;
        const index = parseInt(item.dataset.index, 10);
        App.openModal(this.currentGenerations[index]);
      });
    });

    this.resultGrid.querySelectorAll('[data-action="download"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        window.location.href = API.getDownloadUrl(this.currentGenerations[index].id);
      });
    });
  },

  setLoading(loading) {
    this.submitButton.disabled = loading;
    this.submitButton.querySelector('.btn-text').hidden = loading;
    this.submitButton.querySelector('.btn-loading').hidden = !loading;
  },

  downloadAllImages() {
    if (this.currentGenerations.length === 0) return;

    // Download each image with a small delay to avoid browser blocking
    this.currentGenerations.forEach((gen, i) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = API.getDownloadUrl(gen.id);
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, i * 500);
    });

    App.showNotification(`${this.currentGenerations.length} Downloads gestartet`, 'success');
  }
};
