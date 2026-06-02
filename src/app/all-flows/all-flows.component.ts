import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PowerPlatformService } from '../services/power-platform.service';
import { Environment, Flow } from '../models/power-platform.models';

export interface GlobalFlow extends Flow {
  envId: string;
  envName: string;
}

type SortField = 'objectId' | 'objectName' | 'objectCreated' | 'objectModified' | 'objectType' | 'environmentName';
type SortDir = 'asc' | 'desc';

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

  // Search / filter state
  filterEnvironment = '';
  filterState = '';

  // Sorting
  sortField: SortField = 'objectName';
  sortDir: SortDir = 'asc';

  // Derived lists for filter dropdowns
  environments: string[] = [];
  states: string[] = [];

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
              envName: env.environmentName || 'Unnamed',
              // Standardize values in case backend is older
              objectId: f.objectId || f.flowId,
              objectName: f.objectName || f.flowName,
              objectCreated: f.objectCreated || new Date().toISOString(),
              objectModified: f.objectModified || new Date().toISOString(),
              objectLink: f.objectLink || `https://make.powerautomate.com/environments/${env.environmentId}/flows/${f.flowId}/details`,
              objectType: f.objectType || 'Flow',
              environmentName: f.environmentName || env.environmentName
            } as GlobalFlow)))
          )
        );
        return forkJoin(requests);
      })
    ).subscribe({
      next: (results) => {
        // Flatten the array of arrays
        this.allFlows = results.reduce((acc, val) => acc.concat(val), []);
        this.environments = [...new Set(this.allFlows.map(f => f.environmentName).filter((x): x is string => !!x))].sort();
        this.states = [...new Set(this.allFlows.map(f => f.state).filter((x): x is string => !!x))].sort();
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
    const q = this.searchQuery.trim().toLowerCase();

    let result = this.allFlows.filter(f => {
      const matchesSearch = !q || [
        f.objectId,
        f.objectName,
        f.environmentName,
        f.objectType
      ].some(v => v?.toLowerCase().includes(q));

      const matchesEnv = !this.filterEnvironment || f.environmentName === this.filterEnvironment;
      const matchesState = !this.filterState || f.state === this.filterState;

      return matchesSearch && matchesEnv && matchesState;
    });

    // Sort
    result = result.slice().sort((a, b) => {
      const av = this.getSortValue(a);
      const bv = this.getSortValue(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }

  private getSortValue(f: GlobalFlow): string {
    return (f[this.sortField] ?? '').toString().toLowerCase();
  }

  setSort(field: SortField): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterEnvironment = '';
    this.filterState = '';
  }

  get activeFilterCount(): number {
    return [this.searchQuery, this.filterEnvironment, this.filterState].filter(Boolean).length;
  }
}
