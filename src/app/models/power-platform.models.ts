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
