/** @fileoverview
 * This file contains the code for the model list
 *      Model Config list is used to store/manage approved models
 */
import type { PreTrainedTokenizer } from '@huggingface/transformers';
export interface ModelConfig {
    modelId:string; // We assume  the modelId is the in `<user>/<repo>` format
    urlBase: string; // The base url of the model default will be huggingface
    onnxDir: string; // The directory of the onnx model default will be `onnx`
    configFileName: string;
    repoBase: string;
    modelFileName: string;
    modelExDataFileName?: string;
    // Note: Heavy data fields (configData, modelData, externalData) removed
    // Use fetchchunkstore functions to load model data on-demand
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

// Helper function to store model config data
const storeModelConfig = async (modelId: string, configData: any): Promise<void> => {
    const { storeData } = await import('./fetchchunkstore.ts');
    await storeData(`${modelId}_config`, configData);
};

// Helper function to load model config data
export const loadModelConfig = async (modelId: string): Promise<any> => {
    const { loadData } = await import('./fetchchunkstore.ts');
    return await loadData(`${modelId}_config`);
};

export const OnnxModelFetch = async (config: ModelConfig, progressFn?: (progress: {type:string, msg: string, progress: number, part: string}) => void): Promise<void> => {
    const { modelId, urlBase, onnxDir, configFileName, repoBase, modelFileName, modelExDataFileName } = config;
    const { loadOrFetchModel } = await import('./fetchchunkstore.ts');
    const { fetchAndCache } = await import('./fetchncache.ts');
    const repoUrl = `${urlBase}/${modelId}/${repoBase}`;
    const configUrl = `${repoUrl}/${configFileName}`;
    const modelFileUrl = `${repoUrl}/${onnxDir}/${modelFileName}`;
    const modelExDataUrl = `${repoUrl}/${onnxDir}/${modelExDataFileName}`;
    
    // Download and store model data in IndexedDB using fetchchunkstore
    await Promise.all([
        // @ts-ignore
        loadOrFetchModel(modelFileUrl, modelId, progressFn),
        // Store config data separately with a config-specific key
        fetchAndCache(configUrl).then(res => res.json()).then(configData => {
            // Store config in IndexedDB with a special key
            return storeModelConfig(modelId, configData);
        }),
        // @ts-ignore
        modelExDataFileName ? loadOrFetchModel(modelExDataUrl, `${modelId}_external`, progressFn) : Promise.resolve(),
    ]);
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

    async loadModel(modelId: string, progressFn?: (progress: {type:string, msg: string, progress: number, part: string}) => void): Promise<ModelConfig> {
        const config = this.getModelConfig(modelId);
        if (!config) {
            throw new Error(`Model ${modelId} not found`);
        }
        // Check if model data is already stored in IndexedDB
        const { hasModelData } = await import('./fetchchunkstore.ts');
        const modelExists = await hasModelData(modelId);
        if (modelExists) {
            return config; // Model data exists in storage
        }
        // Download and store model data
        await OnnxModelFetch(config, progressFn);
        return config;
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