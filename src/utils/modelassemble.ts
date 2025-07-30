
export interface ModelGroup {
    modelId: string;
    modelBinary: ArrayBuffer;
    modelConfig: any;
    modelTokenizer?: any;
    externalData?: {path: string, data: ArrayBuffer}[];
}