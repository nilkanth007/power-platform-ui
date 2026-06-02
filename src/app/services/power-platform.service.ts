import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Environment, Flow, FlowDefinition, KeyVaultSecret } from '../models/power-platform.models';
import { environment } from 'src/environments/environment';

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

  getKeyVaultSecrets(): Observable<KeyVaultSecret[]> {
    return this.http.get<KeyVaultSecret[]>(`${this.apiUrl}/keyvault/secrets`).pipe(
      catchError(err => {
        console.warn('API getKeyVaultSecrets failed, returning dummy data', err);
        return of([
          { secretName: 'DatabaseConnectionString', secretValue: 'Server=prod-sql.database.windows.net;Database=AppDB;...', vaultName: 'kv-prod-us', environmentName: 'Production US', environmentId: 'Prod-456' },
          { secretName: 'ApiKey-SendGrid', secretValue: 'SG.xxxxxxxxxxxxxxxxxxxx', vaultName: 'kv-prod-us', environmentName: 'Production US', environmentId: 'Prod-456' },
          { secretName: 'StorageAccountKey', secretValue: 'DefaultEndpointsProtocol=https;AccountName=...', vaultName: 'kv-prod-us', environmentName: 'Production US', environmentId: 'Prod-456' },
          { secretName: 'JwtSigningKey', secretValue: 'a1b2c3d4e5f6g7h8i9j0...', vaultName: 'kv-dev-eu', environmentName: 'Development EU', environmentId: 'Dev-789' },
          { secretName: 'SmtpPassword', secretValue: 'P@ssw0rd!Encrypted', vaultName: 'kv-dev-eu', environmentName: 'Development EU', environmentId: 'Dev-789' },
          { secretName: 'CosmosDbKey', secretValue: 'AccountEndpoint=https://cosmos-prod.documents.azure.com:443/;AccountKey=...', vaultName: 'kv-default', environmentName: 'Default (Contoso)', environmentId: 'Default-123' },
          { secretName: 'RedisConnectionString', secretValue: 'redis-prod.redis.cache.windows.net:6380,password=...', vaultName: 'kv-default', environmentName: 'Default (Contoso)', environmentId: 'Default-123' },
          { secretName: 'AppInsightsKey', secretValue: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', vaultName: 'kv-default', environmentName: 'Default (Contoso)', environmentId: 'Default-123' }
        ]);
      })
    );
  }
}

