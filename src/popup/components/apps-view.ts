import './model-item'

export interface App {
  id: string
  domain: string
  path: string
  title: string
  permissions: string
}

interface ApprovedAppFromSW {
  id: string
  name: string
  origin: string
  description?: string
  approvedAt: number
  permissions: string[]
}

export class AppsView extends HTMLElement {
  private apps: App[] = []
  private filter: 'my-apps' | 'llms' = 'my-apps'
  private revoking: Set<string> = new Set()
  private modelStatus: {
    modelIds: string[]
    downloadedModels: string[]
    currentSelectedModel: string | null
  } = { modelIds: [], downloadedModels: [], currentSelectedModel: null }
  private openModelId: string | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.loadApps()
  }

  connectedCallback() {
    this.render()
    this.setupEventListeners()
  }

  private async loadApps() {
    try {
      const approved = await this.fetchApprovedAppsFromServiceWorker()
      this.apps = approved
      await this.setStoredApps(this.apps)
    } catch {
      const storedApps = await this.getStoredApps()
      this.apps = storedApps.length > 0 ? storedApps : []
    }
    this.render()
  }

  private async getStoredApps(): Promise<App[]> {
    try {
      const result = await chrome.storage.local.get(['apps'])
      return result.apps || []
    } catch {
      return []
    }
  }

  private async setStoredApps(apps: App[]): Promise<void> {
    try {
      await chrome.storage.local.set({ apps })
    } catch {
      // no-op
    }
  }

  private async fetchApprovedAppsFromServiceWorker(): Promise<App[]> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'getApprovedApps' }, (response) => {
        if (!response || response.success !== true) {
          reject(new Error(response?.message || 'Failed to get approved apps'))
          return
        }
        const list = (response.data as ApprovedAppFromSW[]).map((a) => {
          const url = new URL(a.origin)
          const app: App = {
            id: a.id,
            domain: url.host,
            path: url.pathname || '/',
            title: a.name,
            permissions: (a.permissions || []).join(', ')
          }
          return app
        })
        resolve(list)
      })
    })
  }

  private async fetchModelStatus(): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'status' }, (response) => {
        if (response && response.success && response.data) {
          const { modelIds, downloadedModels, currentSelectedModel } = response.data as {
            modelIds: string[]
            downloadedModels: string[]
            currentSelectedModel: string | null
          }
          this.modelStatus = { modelIds, downloadedModels, currentSelectedModel }
        }
        resolve()
      })
    })
  }

  private async addModelConfig(config: {
    modelId: string
    urlBase: string
    onnxDir: string
    configFileName: string
    repoBase: string
    modelFileName: string
    modelExDataFileName?: string
  }): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'addModel', modelConfig: config }, async (response) => {
        if (response && response.success) {
          await this.fetchModelStatus()
          this.render()
          resolve(true)
        } else {
          resolve(false)
        }
      })
    })
  }

  private async downloadModel(modelId: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'downloadModel', modelId }, async (_response) => {
        await this.fetchModelStatus()
        this.render()
        resolve()
      })
    })
  }

  private async clearModel(modelId: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'clearModel', modelId }, async (_response) => {
        await this.fetchModelStatus()
        this.render()
        resolve()
      })
    })
  }

  private async selectModel(modelId: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'setSelectedModel', modelId }, async (_response) => {
        await this.fetchModelStatus()
        this.render()
        resolve()
      })
    })
  }

  private showAddModelForm() {
    const modal = document.createElement('div')
    modal.style.position = 'fixed'
    modal.style.inset = '0'
    modal.style.background = 'rgba(0,0,0,0.4)'
    modal.style.display = 'flex'
    modal.style.alignItems = 'center'
    modal.style.justifyContent = 'center'

    const card = document.createElement('div')
    card.style.background = 'white'
    card.style.borderRadius = '8px'
    card.style.padding = '16px'
    card.style.width = '420px'
    card.style.maxWidth = '90vw'
    card.innerHTML = `
      <h3 style="margin:0 0 12px 0;">Add Model Configuration</h3>
      <form id="add-model-form" style="display:flex; flex-direction:column; gap:8px;">
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>Model ID</span>
          <input name="modelId" required placeholder="Xenova/TinyLlama-1.1B-Chat-v1.0" style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>URL Base</span>
          <input name="urlBase" value="https://huggingface.co" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>ONNX Directory</span>
          <input name="onnxDir" value="onnx" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>Config File Name</span>
          <input name="configFileName" value="config.json" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>Repo Base</span>
          <input name="repoBase" value="resolve/main" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>Model File Name</span>
          <input name="modelFileName" value="model.onnx" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>External Data File (optional)</span>
          <input name="modelExDataFileName" placeholder="model_external_data.bin" style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
          <button type="button" id="cancel-add-model" class="filter-tab" style="background:#6c757d; color:white;">Cancel</button>
          <button type="submit" class="filter-tab" style="background:#007AFF; color:white;">Save</button>
        </div>
      </form>
    `
    modal.appendChild(card)
    document.body.appendChild(modal)

    modal.addEventListener('click', (e) => {
      if (e.target === modal || (e.target as HTMLElement).id === 'cancel-add-model') {
        document.body.removeChild(modal)
      }
    })

    const form = card.querySelector('#add-model-form') as HTMLFormElement
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const data = new FormData(form)
      const modelId = String(data.get('modelId') || '').trim()
      const urlBase = String(data.get('urlBase') || '').trim()
      const onnxDir = String(data.get('onnxDir') || '').trim()
      const configFileName = String(data.get('configFileName') || '').trim()
      const repoBase = String(data.get('repoBase') || '').trim()
      const modelFileName = String(data.get('modelFileName') || '').trim()
      const modelExDataFileNameRaw = String(data.get('modelExDataFileName') || '').trim()
      const payload: any = { modelId, urlBase, onnxDir, configFileName, repoBase, modelFileName }
      if (modelExDataFileNameRaw) payload.modelExDataFileName = modelExDataFileNameRaw
      const ok = await this.addModelConfig(payload)
      if (ok) document.body.removeChild(modal)
    })
  }

  private async showEditModelForm(initial: {
    modelId: string
    urlBase?: string
    onnxDir?: string
    configFileName?: string
    repoBase?: string
    modelFileName?: string
    modelExDataFileName?: string
  }) {
    const modal = document.createElement('div')
    modal.style.position = 'fixed'
    modal.style.inset = '0'
    modal.style.background = 'rgba(0,0,0,0.4)'
    modal.style.display = 'flex'
    modal.style.alignItems = 'center'
    modal.style.justifyContent = 'center'

    const card = document.createElement('div')
    card.style.background = 'white'
    card.style.borderRadius = '8px'
    card.style.padding = '16px'
    card.style.width = '420px'
    card.style.maxWidth = '90vw'
    card.innerHTML = `
      <h3 style="margin:0 0 12px 0;">Edit Model Configuration</h3>
      <form id="edit-model-form" style="display:flex; flex-direction:column; gap:8px;">
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>Model ID</span>
          <input name="modelId" value="${initial.modelId}" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" disabled />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>URL Base</span>
          <input name="urlBase" value="${initial.urlBase || 'https://huggingface.co'}" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>ONNX Directory</span>
          <input name="onnxDir" value="${initial.onnxDir || 'onnx'}" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>Config File Name</span>
          <input name="configFileName" value="${initial.configFileName || 'config.json'}" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>Repo Base</span>
          <input name="repoBase" value="${initial.repoBase || 'resolve/main'}" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>Model File Name</span>
          <input name="modelFileName" value="${initial.modelFileName || 'model.onnx'}" required style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <label style="display:flex; flex-direction:column; font-size:12px;">
          <span>External Data File (optional)</span>
          <input name="modelExDataFileName" value="${initial.modelExDataFileName || ''}" placeholder="model_external_data.bin" style="padding:6px; border:1px solid #e0e0e0; border-radius:4px;" />
        </label>
        <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
          <button type="button" id="cancel-edit-model" class="filter-tab" style="background:#6c757d; color:white;">Cancel</button>
          <button type="submit" class="filter-tab" style="background:#007AFF; color:white;">Save</button>
        </div>
      </form>
    `
    modal.appendChild(card)
    document.body.appendChild(modal)

    modal.addEventListener('click', (e) => {
      if (e.target === modal || (e.target as HTMLElement).id === 'cancel-edit-model') {
        document.body.removeChild(modal)
      }
    })

    const form = card.querySelector('#edit-model-form') as HTMLFormElement
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const data = new FormData(form)
      const payload = {
        modelId: String(data.get('modelId') || '').trim(),
        urlBase: String(data.get('urlBase') || '').trim(),
        onnxDir: String(data.get('onnxDir') || '').trim(),
        configFileName: String(data.get('configFileName') || '').trim(),
        repoBase: String(data.get('repoBase') || '').trim(),
        modelFileName: String(data.get('modelFileName') || '').trim(),
        modelExDataFileName: String(data.get('modelExDataFileName') || '').trim() || undefined,
      }
      chrome.runtime.sendMessage({ type: 'updateModel', modelConfig: payload }, async (response) => {
        if (response && response.success) {
          await this.fetchModelStatus()
          this.render()
          document.body.removeChild(modal)
        } else {
          alert(response?.message || 'Failed to update model')
        }
      })
    })
  }

  private async refreshApprovedApps(): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'refreshApprovedApps' }, (response) => {
        if (response && response.success === true) {
          const list = (response.data as ApprovedAppFromSW[]).map((a) => {
            const url = new URL(a.origin)
            const app: App = {
              id: a.id,
              domain: url.host,
              path: url.pathname || '/',
              title: a.name,
              permissions: (a.permissions || []).join(', ')
            }
            return app
          })
          this.apps = list
          this.setStoredApps(this.apps)
          this.render()
        }
        resolve()
      })
    })
  }

  private async revokeApp(appId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.revoking.add(appId)
      this.render()
      chrome.runtime.sendMessage({ type: 'revokeAppApproval', appId }, async (response) => {
        this.revoking.delete(appId)
        if (response && response.success) {
          await this.refreshApprovedApps()
          resolve(true)
        } else {
          this.render()
          resolve(false)
        }
      })
    })
  }


  private render() {
    if (!this.shadowRoot) return

    const filteredApps = this.filter === 'my-apps' ? this.apps : []

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .apps-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .filter-tab {
          padding: 6px 12px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
          transition: all 0.2s ease;
        }
        
        .filter-tab:hover {
          background: #f0f0f0;
          color: #333;
        }
        
        .dark .filter-tab:hover {
          background: #404040;
          color: #e0e0e0;
        }
        
        .filter-tab.active {
          background: #007AFF;
          color: white;
        }
        
        .app-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .app-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid #e0e0e0;
        }
        
        .dark .app-item {
          background: #2d2d2d;
          border-color: #404040;
        }
        
        .app-item:hover {
          background: #f8f9fa;
          border-color: #007AFF;
        }
        
        .dark .app-item:hover {
          background: #404040;
        }
        
        .app-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: #f0f0f0;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #666;
        }
        
        .app-info {
          flex: 1;
        }
        
        .app-title {
          font-weight: 500;
          margin-bottom: 4px;
          color: #333;
        }
        
        .dark .app-title {
          color: #e0e0e0;
        }
        
        .app-domain {
          font-size: 12px;
          color: #666;
        }
        
        .app-permissions {
          font-size: 10px;
          color: #007AFF;
          background: rgba(0, 122, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
          display: inline-block;
        }
        .model-list { display:flex; flex-direction:column; gap:8px; }
        .model-item { display:flex; align-items:center; padding:12px; background:white; border-radius:8px; border:1px solid #e0e0e0; }
        .dark .model-item { background:#2d2d2d; border-color:#404040; }
        .model-id { font-weight:500; color:#333; }
        .dark .model-id { color:#e0e0e0; }
        .badge { font-size:10px; padding:2px 6px; border-radius:4px; display:inline-block; margin-left:8px; }
        .badge.downloaded { color:#2e7d32; background:rgba(46,125,50,0.12); }
        .badge.selected { color:#aa00ff; background:rgba(170,0,255,0.12); }
        .model-actions { margin-left:auto; display:flex; gap:6px; }
        .icon-button { width:28px; height:28px; padding:0; display:inline-flex; align-items:center; justify-content:center; border:none; background:none; cursor:pointer; border-radius:6px; color:#666; }
        .icon-button:hover { background:#f0f0f0; color:#333; }
        .dark .icon-button:hover { background:#404040; color:#e0e0e0; }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }
        
        .empty-state h3 {
          margin-bottom: 8px;
          color: #333;
        }
        
        .dark .empty-state h3 {
          color: #e0e0e0;
        }
      </style>
      
      <div class="apps-container">
        <div class="filter-tabs">
          <button class="filter-tab ${this.filter === 'my-apps' ? 'active' : ''}" data-filter="my-apps">
            My Apps
          </button>
          <button class="filter-tab ${this.filter === 'llms' ? 'active' : ''}" data-filter="llms">
            LLMs
          </button>
          <span style="flex:1"></span>
          <button class="filter-tab" id="refresh-apps" title="Refresh apps">
            <span style="display:inline-flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>Apps</span>
            </span>
          </button>
        </div>
        
        ${this.filter === 'my-apps' ? `
          <div class="app-list">
            ${filteredApps.length > 0 ? 
              filteredApps.map(app => `
                <div class="app-item" data-app-id="${app.id}">
                  <div class="app-icon">
                    ${app.title.charAt(0).toUpperCase()}
                  </div>
                  <div class="app-info">
                    <div class="app-title">${app.title}</div>
                    <div class="app-domain">${app.domain}</div>
                    <div class="app-permissions">${app.permissions}</div>
                  </div>
                  <div>
                    <button class="filter-tab revoke-btn" data-app-id="${app.id}" ${this.revoking.has(app.id) ? 'disabled' : ''}>
                      ${this.revoking.has(app.id) ? 'Revoking...' : 'Revoke'}
                    </button>
                  </div>
                </div>
              `).join('') :
              `<div class="empty-state">
                <h3>No apps found</h3>
                <p>Add your first app to get started</p>
              </div>`
            }
          </div>
        ` : `
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <button class="filter-tab" id="add-model-btn" style="background:#007AFF; color:white;">Add Model</button>
            <button class="filter-tab" id="refresh-models" title="Refresh models">
              <span style="display:inline-flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span>Models</span>
              </span>
            </button>
          </div>
          <div class="model-list">
            ${this.modelStatus.modelIds.length > 0 ? this.modelStatus.modelIds.map(id => {
              const downloaded = this.modelStatus.downloadedModels.includes(id)
              const selected = this.modelStatus.currentSelectedModel === id
              const open = this.openModelId === id
              return `
                <model-item 
                  model-id="${id}"
                  downloaded="${downloaded}"
                  selected="${selected}"
                  open="${open}"></model-item>
              `
            }).join('') : `
              <div class="empty-state">
                <h3>No models configured</h3>
                <p>Add a model configuration to get started</p>
              </div>
            `}
          </div>
        `}
      </div>
    `
    // Re-bind events after render, since innerHTML replacement removes listeners
    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.shadowRoot) return

    // Filter tabs
    this.shadowRoot.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const filter = target.dataset.filter as 'my-apps' | 'llms'
        if (filter) {
          this.filter = filter
          if (filter === 'llms') {
            this.fetchModelStatus().then(() => this.render())
            return
          }
          this.render()
        }
      })
    })

    // Refresh
    const refreshBtn = this.shadowRoot.querySelector('#refresh-apps') as HTMLButtonElement | null
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await this.refreshApprovedApps()
      })
    }

    // LLMs controls
    const refreshModelsBtn = this.shadowRoot.querySelector('#refresh-models') as HTMLButtonElement | null
    if (refreshModelsBtn) {
      refreshModelsBtn.addEventListener('click', async () => {
        await this.fetchModelStatus()
        this.render()
      })
    }

    const addModelBtn = this.shadowRoot.querySelector('#add-model-btn') as HTMLButtonElement | null
    if (addModelBtn) {
      addModelBtn.addEventListener('click', () => this.showAddModelForm())
    }

    // App items
    this.shadowRoot.querySelectorAll('.app-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const appId = target.dataset.appId
        const app = this.apps.find(a => a.id === appId)
        if (app) this.showAppDetails(app)
      })
    })

    // Revoke buttons
    this.shadowRoot.querySelectorAll('.revoke-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        console.log('[apps-view] revoke click')
        e.stopPropagation()
        const target = e.currentTarget as HTMLButtonElement
        const appId = target.dataset.appId as string
        console.log('[apps-view] revoke appId:', appId)
        await this.revokeApp(appId)
      })
    })

    // Model item events (custom element)
    this.shadowRoot.querySelectorAll('model-item').forEach(item => {
      item.addEventListener('item-click', (e: any) => {
        const clickedId = e.detail?.modelId as string
        this.openModelId = this.openModelId === clickedId ? null : clickedId
        this.render()
      })
      item.addEventListener('download', async (e: any) => {
        const modelId = e.detail?.modelId as string
        await this.downloadModel(modelId)
      })
      item.addEventListener('clear', async (e: any) => {
        const modelId = e.detail?.modelId as string
        await this.clearModel(modelId)
      })
      item.addEventListener('select', async (e: any) => {
        const modelId = e.detail?.modelId as string
        await this.selectModel(modelId)
      })
      item.addEventListener('delete', async (e: any) => {
        const modelId = e.detail?.modelId as string
        const ok = confirm(`Delete model \"${modelId}\"? This will remove it from configuration in a future update.`)
        if (ok) alert('Delete model is not implemented yet.')
      })
      item.addEventListener('edit', async (e: any) => {
        const modelId = e.detail?.modelId as string
        let initial: any = { modelId }
        try {
          const result = await chrome.storage.local.get(['modelConfigs'])
          const list = Array.isArray(result.modelConfigs) ? result.modelConfigs : []
          const found = list.find((c: any) => c && c.modelId === modelId)
          if (found) initial = { ...found }
        } catch { /* ignore */ }
        await this.showEditModelForm(initial)
      })
    })
  }

  private showAppDetails(app: App) {
    // Simple inline modal for details
    const modal = document.createElement('div')
    modal.style.position = 'fixed'
    modal.style.inset = '0'
    modal.style.background = 'rgba(0,0,0,0.4)'
    modal.style.display = 'flex'
    modal.style.alignItems = 'center'
    modal.style.justifyContent = 'center'

    const card = document.createElement('div')
    card.style.background = 'white'
    card.style.borderRadius = '8px'
    card.style.padding = '16px'
    card.style.width = '360px'
    card.style.maxWidth = '90vw'
    card.innerHTML = `
      <h3 style="margin:0 0 8px 0;">${app.title}</h3>
      <div style="color:#666; font-size:12px;">${app.domain}${app.path && app.path !== '/' ? app.path : ''}</div>
      <div style="margin-top:12px; font-size:12px; color:#007AFF;">${app.permissions}</div>
      <div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">
        <button id="close-modal" style="padding:6px 12px; border:none; background:#6c757d; color:white; border-radius:4px; cursor:pointer;">Close</button>
      </div>
    `
    modal.appendChild(card)
    document.body.appendChild(modal)

    modal.addEventListener('click', (e) => {
      if (e.target === modal || (e.target as HTMLElement).id === 'close-modal') {
        document.body.removeChild(modal)
      }
    })
  }
}

customElements.define('apps-view', AppsView)