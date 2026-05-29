import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Environment, Flow, FlowDefinition } from '../models/power-platform.models';

@Injectable({
  providedIn: 'root'
})
export class PowerPlatformService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getEnvironments(): Observable<Environment[]> {
    return this.http.get<Environment[]>(`${this.apiUrl}/environments`);
  }

  getFlows(envId: string): Observable<Flow[]> {
    return this.http.get<Flow[]>(`${this.apiUrl}/flows/environment/${envId}`);
  }

  getFlowDefinition(envId: string, flowId: string): Observable<FlowDefinition> {
    return this.http.get<FlowDefinition>(`${this.apiUrl}/flows/${envId}/${flowId}`);
  }
}
