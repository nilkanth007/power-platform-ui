export interface Environment {
  environmentId: string;
  environmentName: string;
  location: string;
  type: string;
}

export interface Flow {
  flowId: string;
  flowName: string;
  state: string;
  
  // Microsoft List Schema properties
  objectId?: string;
  objectName?: string;
  objectCreated?: string;
  objectModified?: string;
  objectLink?: string;
  objectType?: string;
  environmentName?: string;
}

export interface FlowDefinition {
  properties: {
    definition: any;
  };
}

export interface KeyVaultSecret {
  secretName: string;
  secretValue: string;
  vaultName: string;
  environmentName: string;
  environmentId: string;
  contentType?: string;
  enabled?: boolean;
  expiresOn?: string;
}

