# LLM Control Panel

A modern browser extension that brings local AI model inference to your browser using ONNX Runtime. Experience privacy-first AI interactions with powerful language models running entirely on your device.

## Features

- 🚀 **Local Model Inference**: Run AI models directly in your browser using ONNX Runtime
- 🔒 **Privacy First**: All processing happens locally - no data sent to external servers
- 🎨 **Modern UI**: Built with Web Components for a clean, responsive interface
- 📱 **Cross-Platform**: Works on Chrome, Edge, and other Chromium-based browsers
- 🔧 **Developer Friendly**: Easy integration with websites via JavaScript API
- 📊 **Activity Tracking**: Monitor your AI interactions and model usage
- 🎯 **Multiple Models**: Support for TinyLlama, Llama 2, and more

## Tech Stack

- **TypeScript**: Type-safe development
- **Web Components**: Modern, reusable UI components
- **ONNX Runtime**: High-performance model inference
- **Vite**: Fast build tooling
- **Chrome Extensions API**: Browser integration

## Supported Models

- **TinyLlama 1.1B Chat**: Fast, lightweight model for quick responses
- **Llama 2 7B Chat**: Balanced performance and speed
- **Llama 2 13B Chat**: Higher quality responses with more parameters

## Installation

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd LLMControlPanel
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` folder
4. The extension should now appear in your extensions list

## Usage

### Basic Usage

1. Click the extension icon in your browser toolbar
2. Navigate to the "Settings" tab
3. Select a model and click "Load Model"
4. Once loaded, you can test the model or use it in websites

### Website Integration

The extension provides a global API for websites to use:

```javascript
// Check if the extension is available
if (window.llmControlPanel) {
  // Generate a response
  const response = await window.llmControlPanel.generateResponse(
    "Hello, how are you?",
    "tinyllama-1.1b-chat"
  );
  console.log(response);
}
```

### API Reference

#### `window.llmControlPanel.generateResponse(prompt, modelId)`

Generates a response using the specified model.

- `prompt` (string): The input text to generate a response for
- `modelId` (string): The ID of the model to use (optional, uses default if not specified)
- Returns: Promise<string> - The generated response

#### `window.llmControlPanel.testModel(modelId, message)`

Tests a specific model with a message.

- `modelId` (string): The ID of the model to test
- `message` (string): The test message
- Returns: Promise<string> - The test response

## Project Structure

```
src/
├── popup/                 # Extension popup interface
│   ├── components/        # Web Components
│   │   ├── nav-bar.ts
│   │   ├── apps-view.ts
│   │   ├── activity-view.ts
│   │   ├── settings-view.ts
│   │   ├── help-view.ts
│   │   ├── about-view.ts
│   │   └── sliding-pane.ts
│   ├── index.html
│   └── index.ts
├── background/            # Service worker
│   └── index.ts
├── content/              # Content scripts
│   └── index.ts
└── core/                 # Shared components and utilities
    ├── components/
    ├── managers/
    ├── providers/
    └── views/
```

## Development

### Commands

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build for production
- `npm run preview`: Preview the built extension
- `npm run lint`: Run ESLint
- `npm run type-check`: Run TypeScript type checking

### Adding New Models

1. Add the model configuration to `src/popup/components/settings-view.ts`
2. Update the ONNX model loading logic in `src/background/index.ts`
3. Test the model integration

### Customizing the UI

The UI is built with Web Components, making it easy to customize:

1. Modify the component styles in the `render()` method
2. Add new components in `src/popup/components/`
3. Update the main layout in `src/popup/components/llm-control-panel.ts`

## Privacy & Security

- **Local Processing**: All model inference happens in your browser
- **No Data Collection**: No user data is sent to external servers
- **Open Source**: Transparent codebase for security review
- **Permission Minimal**: Only requests necessary browser permissions

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run lint && npm run type-check`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by [WebextLLM](https://github.com/idosal/WebextLLM)
- Built with [ONNX Runtime](https://onnxruntime.ai/)
- Powered by [Vite](https://vitejs.dev/)

## Support

- 📖 **Documentation**: Check the Help section in the extension
- 🐛 **Issues**: Report bugs on GitHub
- 💡 **Feature Requests**: Open an issue with your suggestion
- 💬 **Discussions**: Join the community discussions

---

**Note**: This is a development version. For production use, ensure all models are properly licensed and comply with their respective terms of use. 