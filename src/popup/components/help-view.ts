export class HelpView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
  }

  private render() {
    if (!this.shadowRoot) return

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .help-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .help-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        .dark .section-title {
          color: #e0e0e0;
        }
        
        .help-text {
          font-size: 14px;
          line-height: 1.6;
          color: #666;
        }
        
        .dark .help-text {
          color: #ccc;
        }
        
        .code-block {
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          color: #333;
          overflow-x: auto;
        }
        
        .dark .code-block {
          background: #2d2d2d;
          border-color: #404040;
          color: #e0e0e0;
        }
        
        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .feature-icon {
          color: #007AFF;
          font-size: 16px;
          margin-top: 2px;
        }
        
        .feature-text {
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        }
        
        .dark .feature-text {
          color: #ccc;
        }
      </style>
      
      <div class="help-container">
        <div class="help-section">
          <h3 class="section-title">Getting Started</h3>
          <p class="help-text">
            LLM Control Panel is a browser extension that allows you to run AI models locally using ONNX Runtime. 
            This provides privacy and performance benefits over cloud-based solutions.
          </p>
        </div>
        
        <div class="help-section">
          <h3 class="section-title">Features</h3>
          <ul class="feature-list">
            <li class="feature-item">
              <span class="feature-icon">✓</span>
              <span class="feature-text">Local model inference with ONNX Runtime</span>
            </li>
            <li class="feature-item">
              <span class="feature-icon">✓</span>
              <span class="feature-text">Multiple model support (TinyLlama, Llama 2)</span>
            </li>
            <li class="feature-item">
              <span class="feature-icon">✓</span>
              <span class="feature-text">Web Component-based UI</span>
            </li>
            <li class="feature-item">
              <span class="feature-icon">✓</span>
              <span class="feature-text">Activity tracking and history</span>
            </li>
            <li class="feature-item">
              <span class="feature-icon">✓</span>
              <span class="feature-text">App management and permissions</span>
            </li>
          </ul>
        </div>
        
        <div class="help-section">
          <h3 class="section-title">Usage</h3>
          <p class="help-text">
            To use the extension with a website:
          </p>
          <div class="code-block">
// Check if the extension is available
if (window.llmControlPanel) {
  // Generate a response
  const response = await window.llmControlPanel.generateResponse(
    "Hello, how are you?",
    "tinyllama-1.1b-chat"
  );
  console.log(response);
}
          </div>
        </div>
        
        <div class="help-section">
          <h3 class="section-title">Model Loading</h3>
          <p class="help-text">
            Models are loaded in the background and cached for performance. 
            The first time you use a model, it may take a few moments to download and initialize.
          </p>
        </div>
        
        <div class="help-section">
          <h3 class="section-title">Privacy</h3>
          <p class="help-text">
            All model inference happens locally in your browser. No data is sent to external servers, 
            ensuring your conversations remain private.
          </p>
        </div>
      </div>
    `
  }
}

customElements.define('help-view', HelpView) 