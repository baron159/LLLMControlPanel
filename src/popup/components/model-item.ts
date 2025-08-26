export class ModelItem extends HTMLElement {
  static get observedAttributes() {
    return ['model-id', 'downloaded', 'selected', 'open']
  }

  private _modelId: string = ''
  private _downloaded: boolean = false
  private _selected: boolean = false
  private _open: boolean = false
  private _downloading: boolean = false
  private _progressText: string = ''
  private _metainfo: {
    pipelineType?: string
    lastModified?: string
    private?: boolean
    gated?: boolean
    passedOnnx?: boolean
  } | undefined

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
    this.loadMetainfo()
    this.listenForProgress()
  }

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null) {
    switch (name) {
      case 'model-id':
        this._modelId = newVal || ''
        this.loadMetainfo()
        break
      case 'downloaded':
        this._downloaded = newVal === 'true'
        break
      case 'selected':
        this._selected = newVal === 'true'
        break
      case 'open':
        this._open = newVal === 'true'
        break
    }
    this.render()
    this.updateDetailsHeight()
  }

  private async loadMetainfo() {
    if (!this._modelId) return
    try {
      const result = await chrome.storage.local.get(['modelConfigs'])
      const list = Array.isArray(result.modelConfigs) ? result.modelConfigs : []
      const found = list.find((c: any) => c && c.modelId === this._modelId)
      this._metainfo = found?.metainfo
      this.render()
      this.updateDetailsHeight()
    } catch {
      // ignore
    }
  }

  private updateDetailsHeight() {
    const details = this.shadowRoot?.querySelector('.details') as HTMLElement | null
    if (!details) return
    if (this._open) {
      // set to content height for smooth transition
      details.style.maxHeight = details.scrollHeight + 'px'
    } else {
      details.style.maxHeight = '0px'
    }
  }

  private listenForProgress() {
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (!this._modelId) return
      if (message?.type === 'downloadProgress' && message.modelId === this._modelId) {
        const info = message.info
        this._downloading = true
        if (info?.type === 'download') {
          const loaded = info.loaded || 0
          const total = info.total || 0
          const pct = total ? Math.round((loaded / total) * 100) : undefined
          this._progressText = pct !== undefined ? `Downloading ${pct}%` : `Downloading...`
        } else if (info?.type === 'chunkStored') {
          this._progressText = `Storing chunks (${(info.chunkIndex ?? 0) + 1})`
        } else if (info?.type === 'complete') {
          this._progressText = 'Finalizing'
        } else if (info?.type === 'error') {
          this._progressText = 'Error'
          this._downloading = false
        } else if (info?.type === 'info') {
          this._progressText = info.msg || '...'
        }
        this.render()
      } else if (message?.type === 'downloadComplete' && message.modelId === this._modelId) {
        this._downloading = false
        this._progressText = ''
        this.render()
      } else if (message?.type === 'modelCleared' && message.modelId === this._modelId) {
        this._downloading = false
        this._progressText = ''
        this.render()
      }
    })
  }

  private onHeaderClick = (e: Event) => {
    // prevent button clicks from toggling
    const target = e.target as HTMLElement
    if (target.closest('.actions')) return
    this.dispatchEvent(new CustomEvent('item-click', {
      bubbles: true,
      composed: true,
      detail: { modelId: this._modelId }
    }))
  }

  private wireActionHandlers() {
    const root = this.shadowRoot
    if (!root) return
    const downloadBtn = root.querySelector('#download-btn') as HTMLButtonElement | null
    const selectBtn = root.querySelector('#select-btn') as HTMLButtonElement | null
    const deleteBtn = root.querySelector('#delete-btn') as HTMLButtonElement | null
    const editBtn = root.querySelector('#edit-btn') as HTMLButtonElement | null
    const clearBtn = root.querySelector('#clear-btn') as HTMLButtonElement | null

    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this._downloading = true
        this._progressText = 'Starting...'
        this.render()
        this.dispatchEvent(new CustomEvent('download', { bubbles: true, composed: true, detail: { modelId: this._modelId } }))
      })
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.dispatchEvent(new CustomEvent('clear', { bubbles: true, composed: true, detail: { modelId: this._modelId } }))
      })
    }
    if (selectBtn) {
      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.dispatchEvent(new CustomEvent('select', { bubbles: true, composed: true, detail: { modelId: this._modelId } }))
      })
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.dispatchEvent(new CustomEvent('delete', { bubbles: true, composed: true, detail: { modelId: this._modelId } }))
      })
    }
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.dispatchEvent(new CustomEvent('edit', { bubbles: true, composed: true, detail: { modelId: this._modelId } }))
      })
    }
  }

  private render() {
    if (!this.shadowRoot) return
    const downloaded = this._downloaded
    const selected = this._selected
    const mi = this._metainfo || {}
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .card { border:1px solid #e0e0e0; border-radius:8px; background:white; }
        .dark .card { background:#2d2d2d; border-color:#404040; }
        .header { display:flex; align-items:center; padding:12px; cursor:pointer; }
        .header:hover { background:#f8f9fa; }
        .dark .header:hover { background:#404040; }
        .title { font-weight:500; color:#333; }
        .dark .title { color:#e0e0e0; }
        .badges { margin-left:8px; display:inline-flex; gap:6px; }
        .badge { font-size:10px; padding:2px 6px; border-radius:4px; display:inline-block; }
        .downloaded { color:#2e7d32; background:rgba(46,125,50,0.12); }
        .selected { color:#aa00ff; background:rgba(170,0,255,0.12); }
        .spacer { flex:1; }
        .actions { display:flex; gap:6px; align-items:center; }
        .icon-button { width:28px; height:28px; padding:0; display:inline-flex; align-items:center; justify-content:center; border:none; background:none; cursor:pointer; border-radius:6px; color:#666; }
        .icon-button:hover { background:#f0f0f0; color:#333; }
        .dark .icon-button:hover { background:#404040; color:#e0e0e0; }
        .progress { font-size:11px; color:#666; margin-right:6px; }
        .spinner { width:14px; height:14px; border:2px solid #ccc; border-top-color:#007AFF; border-radius:50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .details { overflow:hidden; max-height:0; transition:max-height 0.2s ease; }
        .details-inner { padding:0 12px 12px 12px; font-size:12px; color:#555; }
        .dark .details-inner { color:#ddd; }
        .grid { display:grid; grid-template-columns: 140px 1fr; row-gap:6px; column-gap:12px; }
        .label { color:#777; }
      </style>
      <div class="card">
        <div class="header" id="header">
          <div class="title">${this._modelId}</div>
          <div class="badges">
            ${downloaded ? '<span class="badge downloaded">Downloaded</span>' : ''}
            ${selected ? '<span class="badge selected">Selected</span>' : ''}
          </div>
          <div class="spacer"></div>
          <div class="actions">
            ${this._downloading ? `<span class=\"progress\">${this._progressText}</span><span class=\"spinner\" aria-hidden=\"true\"></span>` : ''}
            ${!downloaded && !this._downloading ? `
              <button class="icon-button" id="download-btn" title="Download" aria-label="Download">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 21h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>` : ''}
            ${downloaded && !this._downloading ? `
              <button class="icon-button" id="clear-btn" title="Clear" aria-label="Clear">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>` : ''}
            ${!selected ? `
              <button class="icon-button" id="select-btn" title="Select" aria-label="Select">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>` : ''}
            <button class="icon-button" id="delete-btn" title="Delete" aria-label="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button class="icon-button" id="edit-btn" title="Edit" aria-label="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div class="details">
          <div class="details-inner">
            <div class="grid">
              <div class="label">Pipeline</div><div>${mi.pipelineType ?? '—'}</div>
              <div class="label">Last Modified</div><div>${mi.lastModified ?? '—'}</div>
              <div class="label">Private</div><div>${mi.private === true ? 'Yes' : mi?.private === false ? 'No' : '—'}</div>
              <div class="label">Gated</div><div>${mi.gated === true ? 'Yes' : mi?.gated === false ? 'No' : '—'}</div>
              <div class="label">ONNX Tag</div><div>${mi.passedOnnx === true ? 'Present' : mi?.passedOnnx === false ? 'Absent' : '—'}</div>
            </div>
          </div>
        </div>
      </div>
    `
    const header = this.shadowRoot.querySelector('#header') as HTMLElement | null
    if (header) {
      header.removeEventListener('click', this.onHeaderClick)
      header.addEventListener('click', this.onHeaderClick)
    }
    this.wireActionHandlers()
    // ensure correct height after first render
    requestAnimationFrame(() => this.updateDetailsHeight())
  }
}

customElements.define('model-item', ModelItem)


