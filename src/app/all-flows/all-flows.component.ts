import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PowerPlatformService } from '../services/power-platform.service';
import { Environment, Flow } from '../models/power-platform.models';

export interface GlobalFlow extends Flow {
  envId: string;
  envName: string;
}

@Component({
  selector: 'app-all-flows',
  templateUrl: './all-flows.component.html',
  styleUrls: ['./all-flows.component.css']
})
export class AllFlowsComponent implements OnInit {
  allFlows: GlobalFlow[] = [];
  isLoading = true;
  error = '';
  searchQuery = '';

  constructor(private ppService: PowerPlatformService) {}

  ngOnInit(): void {
    this.loadAllFlows();
  }

  loadAllFlows(): void {
    this.ppService.getEnvironments().pipe(
      switchMap(envs => {
        if (!envs || envs.length === 0) {
          return of([]);
        }
        const requests = envs.map(env => 
          this.ppService.getFlows(env.environmentId).pipe(
            catchError(err => {
              console.warn(`Failed to fetch flows for env ${env.environmentName}`, err);
              return of([]);
            }),
            map(flows => flows.map(f => ({
              ...f,
              envId: env.environmentId,
              envName: env.environmentName || 'Unnamed'
            } as GlobalFlow)))
          )
        );
        return forkJoin(requests);
      })
    ).subscribe({
      next: (results) => {
        // Flatten the array of arrays
        this.allFlows = results.reduce((acc, val) => acc.concat(val), []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load flows across environments.';
        this.isLoading = false;
      }
    });
  }

  get filteredFlows(): GlobalFlow[] {
    if (!this.searchQuery) {
      return this.allFlows;
    }
    const q = this.searchQuery.toLowerCase();
    return this.allFlows.filter(f => 
      (f.flowName && f.flowName.toLowerCase().includes(q)) ||
      (f.flowId && f.flowId.toLowerCase().includes(q)) ||
      (f.envName && f.envName.toLowerCase().includes(q)) ||
      (f.state && f.state.toLowerCase().includes(q))
    );
  }
}
