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
}
