import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Environment, Flow, FlowDefinition, KeyVaultSecret } from '../models/power-platform.models';
import { environment } from '../../environments/environment';

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
        const envName = envId === 'Default-123' ? 'Default (Contoso)' : envId === 'Prod-456' ? 'Production US' : 'Development EU';
        return of([
          { 
            flowId: `flow-abc-${envId}`, 
            flowName: 'Invoice Approval Process', 
            state: 'Started',
            objectId: `flow-abc-${envId}`,
            objectName: 'Invoice Approval Process',
            objectCreated: '2023-01-19T09:03:00Z',
            objectModified: '2023-04-21T08:07:00Z',
            objectLink: `https://make.powerautomate.com/environments/${envId}/flows/flow-abc-${envId}/details`,
            objectType: 'Flow',
            environmentName: envName
          },
          { 
            flowId: `flow-def-${envId}`, 
            flowName: 'Weekly Status Report', 
            state: 'Started',
            objectId: `flow-def-${envId}`,
            objectName: 'Weekly Status Report',
            objectCreated: '2021-11-23T11:27:00Z',
            objectModified: '2023-03-17T11:53:00Z',
            objectLink: `https://make.powerautomate.com/environments/${envId}/flows/flow-def-${envId}/details`,
            objectType: 'Flow',
            environmentName: envName
          },
          { 
            flowId: `flow-ghi-${envId}`, 
            flowName: 'Data Sync (Deprecated)', 
            state: 'Stopped',
            objectId: `flow-ghi-${envId}`,
            objectName: 'Data Sync (Deprecated)',
            objectCreated: '2023-02-23T11:35:00Z',
            objectModified: '2023-02-23T13:07:00Z',
            objectLink: `https://make.powerautomate.com/environments/${envId}/flows/flow-ghi-${envId}/details`,
            objectType: 'Flow',
            environmentName: envName
          }
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

  getKeyVaultSecrets(): Observable<KeyVaultSecret[]> {
    return this.http.get<KeyVaultSecret[]>(`${this.apiUrl}/keyvault/secrets`).pipe(
      catchError(err => {
        console.warn('API getKeyVaultSecrets failed, returning dummy data', err);
        return of([
          { secretName: 'DatabaseConnectionString', secretValue: 'Server=prod-sql.database.windows.net;Database=AppDB;...', vaultName: 'kv-prod-us', environmentName: 'Production US', environmentId: 'Prod-456', contentType: 'connection-string', enabled: true },
          { secretName: 'ApiKey-SendGrid', secretValue: 'SG.xxxxxxxxxxxxxxxxxxxx', vaultName: 'kv-prod-us', environmentName: 'Production US', environmentId: 'Prod-456', contentType: 'api-key', enabled: true, expiresOn: '2026-12-31T00:00:00Z' },
          { secretName: 'StorageAccountKey', secretValue: 'DefaultEndpointsProtocol=https;AccountName=...', vaultName: 'kv-prod-us', environmentName: 'Production US', environmentId: 'Prod-456', contentType: 'storage-key', enabled: false },
          { secretName: 'JwtSigningKey', secretValue: 'a1b2c3d4e5f6g7h8i9j0...', vaultName: 'kv-dev-eu', environmentName: 'Development EU', environmentId: 'Dev-789', contentType: 'certificate', enabled: true },
          { secretName: 'SmtpPassword', secretValue: 'P@ssw0rd!Encrypted', vaultName: 'kv-dev-eu', environmentName: 'Development EU', environmentId: 'Dev-789', contentType: 'password', enabled: true, expiresOn: '2025-06-01T00:00:00Z' },
          { secretName: 'CosmosDbKey', secretValue: 'AccountEndpoint=https://cosmos-prod.documents.azure.com:443/;AccountKey=...', vaultName: 'kv-default', environmentName: 'Default (Contoso)', environmentId: 'Default-123', contentType: 'connection-string', enabled: true },
          { secretName: 'RedisConnectionString', secretValue: 'redis-prod.redis.cache.windows.net:6380,password=...', vaultName: 'kv-default', environmentName: 'Default (Contoso)', environmentId: 'Default-123', contentType: 'connection-string', enabled: true },
          { secretName: 'AppInsightsKey', secretValue: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', vaultName: 'kv-default', environmentName: 'Default (Contoso)', environmentId: 'Default-123', contentType: 'instrumentation-key', enabled: true }
        ]);
      })
    );
  }
}

