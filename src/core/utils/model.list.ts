import type { PreTrainedTokenizer } from '@huggingface/transformers';
export interface ModelConfig {
    modelId:string; // We assume  the modelId is the in `<user>/<repo>` format
    urlBase: string; // The base url of the model default will be huggingface
    onnxDir: string; // The directory of the onnx model default will be `onnx`
    configFileName: string;
    repoBase: string;
    modelFileName: string;
    modelExDataFileName?: string;
    // loaded model
    configData?: any;
    modelData?: ArrayBuffer | Blob;
    externalData?: { path: string, data: ArrayBuffer | Blob }[];
    // tokenizer?: any;

}

export const OnnxModelConfigFill = (id: string, override?: Partial<ModelConfig>): ModelConfig => {
    return {
        modelId: id,
        urlBase: "https://huggingface.co",
        onnxDir: "onnx",
        configFileName: "config.json",
        repoBase: "resolve/main",
        modelFileName: "model.onnx",
        modelExDataFileName: undefined,
        ...override,
    }
}

export const OnnxModelFetch = async (config: ModelConfig, progressFn?: (progress: {type:string, msg: string, progress: number, part: string}) => void): Promise<ModelConfig> => {
    const { modelId, urlBase, onnxDir, configFileName, repoBase, modelFileName, modelExDataFileName } = config;
    const { loadOrFetchModel } = await import('./fetchchunkstore.ts');
    const { fetchAndCache } = await import('./fetchncache.ts');
    const repoUrl = `${urlBase}/${modelId}/${repoBase}`;
    const configUrl = `${repoUrl}/${configFileName}`;
    const modelFileUrl = `${repoUrl}/${onnxDir}/${modelFileName}`;
    const modelExDataUrl = `${repoUrl}/${onnxDir}/${modelExDataFileName}`;
    const [onnxData, configData, modelExData] = await Promise.all([
        // @ts-ignore
        loadOrFetchModel(modelFileUrl, modelId, progressFn),
        fetchAndCache(configUrl).then(res => res.json()),
        // @ts-ignore
        modelExDataFileName ? loadOrFetchModel(modelExDataUrl, modelExDataFileName, progressFn) : undefined,
    ]);
    return { ...config, modelData: onnxData, configData, externalData: modelExData &&[{path: `./${modelExDataFileName}`, data: modelExData}] };
}

/**
 * The class to manage the approved model data lists
 * w/abilty to add new models
 */
export class ModelDataList {
    public readonly modelListId: number;
    private modelConfigs: Map<string, ModelConfig> = new Map();

    constructor(private modelList: ModelConfig[]) {
        this.modelListId = Date.now();
        this.modelList.forEach(config => {
            this.modelConfigs.set(config.modelId, config);
        });
    }

    getModelConfig(modelId: string): ModelConfig | undefined {
        return this.modelConfigs.get(modelId);
    }

    get currentModelList(): string[] {
        return Array.from(this.modelConfigs.keys());
    }

    addModel(modelId:string, options?: Partial<ModelConfig>): ModelConfig {
        const config = OnnxModelConfigFill(modelId, options);
        this.modelConfigs.set(modelId, config);
        return config;
    }

    async loadModel(modelId: string): Promise<ModelConfig> {
        const config = this.getModelConfig(modelId);
        if (!config) {
            throw new Error(`Model ${modelId} not found`);
        }
        if (!!config.modelData) {
            return config;
        }
        const latestConfig = await OnnxModelFetch(config);
        this.modelConfigs.set(modelId, latestConfig);
        return latestConfig as ModelConfig;
    }

    /**
     * Get the tokenizer for the model
     * @param modelId The model id
     * @returns The tokenizer
     */
    async getTokenizer(modelId: string): Promise<PreTrainedTokenizer> {
        const config = this.getModelConfig(modelId);
        if (!config) {
            throw new Error(`Model ${modelId} not found`);
        }
        return await import('@huggingface/transformers').then(async m => await m.AutoTokenizer.from_pretrained(modelId));
    }
}