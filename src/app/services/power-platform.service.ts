import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Environment, Flow, FlowDefinition } from '../models/power-platform.models';

@Injectable({
  providedIn: 'root'
})
export class PowerPlatformService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getEnvironments(): Observable<Environment[]> {
    return this.http.get<Environment[]>(`${this.apiUrl}/environments`).pipe(
      catchError(err => {
        console.warn('API getEnvironments failed, returning dummy data', err);
        return of([
          { environmentId: 'Default-123', environmentName: 'Default (Contoso)', location: 'unitedstates', type: 'Default' },
          { environmentId: 'Prod-456', environmentName: 'Production US', location: 'unitedstates', type: 'Production' },
          { environmentId: 'Dev-789', environmentName: 'Development EU', location: 'europe', type: 'Sandbox' }
        ]);
      })
    );
  }

  getFlows(envId: string): Observable<Flow[]> {
    return this.http.get<Flow[]>(`${this.apiUrl}/flows/environment/${envId}`).pipe(
      catchError(err => {
        console.warn(`API getFlows failed for ${envId}, returning dummy data`, err);
        return of([
          { flowId: `flow-abc-${envId}`, flowName: 'Invoice Approval Process', state: 'Started' },
          { flowId: `flow-def-${envId}`, flowName: 'Weekly Status Report', state: 'Started' },
          { flowId: `flow-ghi-${envId}`, flowName: 'Data Sync (Deprecated)', state: 'Stopped' }
        ]);
      })
    );
  }

  getFlowDefinition(envId: string, flowId: string): Observable<FlowDefinition> {
    return this.http.get<FlowDefinition>(`${this.apiUrl}/flows/${envId}/${flowId}`).pipe(
      catchError(err => {
        console.warn(`API getFlowDefinition failed for ${flowId}, returning dummy data`, err);
        return of({
          properties: {
            definition: {
              "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
              "contentVersion": "1.0.0.0",
              "parameters": {},
              "triggers": {
                "manual": {
                  "type": "Request",
                  "kind": "Http",
                  "inputs": {
                    "schema": {}
                  }
                }
              },
              "actions": {
                "Send_an_email_(V2)": {
                  "runAfter": {},
                  "type": "OpenApiConnection",
                  "inputs": {
                    "host": {
                      "connectionName": "shared_office365",
                      "operationId": "SendEmailV2",
                      "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
                    },
                    "parameters": {
                      "emailMessage/To": "admin@contoso.com",
                      "emailMessage/Subject": "Dummy Subject",
                      "emailMessage/Body": "<p>Dummy flow executed</p>"
                    }
                  }
                }
              }
            }
          }
        });
      })
    );
  }
}
