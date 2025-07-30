export class AboutView extends HTMLElement {
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
        
        .about-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          text-align: center;
        }
        
        .logo {
          width: 64px;
          height: 64px;
          background: #007AFF;
          border-radius: 12px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          font-weight: bold;
        }
        
        .title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
        
        .dark .title {
          color: #e0e0e0;
        }
        
        .version {
          font-size: 14px;
          color: #666;
          margin-bottom: 24px;
        }
        
        .dark .version {
          color: #ccc;
        }
        
        .description {
          font-size: 14px;
          line-height: 1.6;
          color: #666;
          margin-bottom: 24px;
        }
        
        .dark .description {
          color: #ccc;
        }
        
        .tech-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .tech-section {
          text-align: left;
        }
        
        .tech-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
        
        .dark .tech-title {
          color: #e0e0e0;
        }
        
        .tech-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .tech-item {
          background: #f0f0f0;
          color: #666;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .dark .tech-item {
          background: #404040;
          color: #ccc;
        }
        
        .links {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 24px;
        }
        
        .link {
          color: #007AFF;
          text-decoration: none;
          font-size: 14px;
          padding: 8px 12px;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        
        .link:hover {
          background: rgba(0, 122, 255, 0.1);
        }
        
        .dark .link:hover {
          background: rgba(0, 122, 255, 0.2);
        }
      </style>
      
      <div class="about-container">
        <div class="logo">LLM</div>
        
        <div>
          <h2 class="title">LLM Control Panel</h2>
          <div class="version">Version 1.0.0</div>
          <p class="description">
            A browser extension that brings local AI model inference to your browser using ONNX Runtime. 
            Experience privacy-first AI interactions with powerful language models running entirely on your device.
          </p>
        </div>
        
        <div class="tech-stack">
          <div class="tech-section">
            <h3 class="tech-title">Built with:</h3>
            <ul class="tech-list">
              <li class="tech-item">TypeScript</li>
              <li class="tech-item">Web Components</li>
              <li class="tech-item">ONNX Runtime</li>
              <li class="tech-item">Vite</li>
              <li class="tech-item">Chrome Extensions API</li>
            </ul>
          </div>
          
          <div class="tech-section">
            <h3 class="tech-title">Models:</h3>
            <ul class="tech-list">
              <li class="tech-item">TinyLlama 1.1B</li>
              <li class="tech-item">Llama 2 7B</li>
              <li class="tech-item">Llama 2 13B</li>
            </ul>
          </div>
        </div>
        
        <div class="links">
          <a href="#" class="link" id="github-link">GitHub</a>
          <a href="#" class="link" id="docs-link">Documentation</a>
          <a href="#" class="link" id="issues-link">Report Issues</a>
        </div>
      </div>
    `
  }
}

customElements.define('about-view', AboutView) 