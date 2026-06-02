import { Component, OnInit } from '@angular/core';
import { PowerPlatformService } from '../services/power-platform.service';
import { KeyVaultSecret } from '../models/power-platform.models';

type SortField = 'secretName' | 'vaultName' | 'environmentName' | 'contentType' | 'enabled';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-key-vaults',
  templateUrl: './key-vaults.component.html',
  styleUrls: ['./key-vaults.component.css']
})
export class KeyVaultsComponent implements OnInit {
  allSecrets: KeyVaultSecret[] = [];
  isLoading = true;
  error = '';
  revealedSecrets = new Set<KeyVaultSecret>();

  // Search / filter state
  searchQuery = '';
  filterEnvironment = '';
  filterVault = '';
  filterEnabled: '' | 'true' | 'false' = '';

  // Sorting
  sortField: SortField = 'environmentName';
  sortDir: SortDir = 'asc';

  // Derived lists for filter dropdowns
  environments: string[] = [];
  vaults: string[] = [];

  constructor(private ppService: PowerPlatformService) {}

  ngOnInit(): void {
    this.ppService.getKeyVaultSecrets().subscribe({
      next: (data) => {
        this.allSecrets = data;
        this.environments = [...new Set(data.map(s => s.environmentName).filter(Boolean))].sort();
        this.vaults = [...new Set(data.map(s => s.vaultName).filter(Boolean))].sort();
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load Key Vault secrets.';
        this.isLoading = false;
      }
    });
  }

  get filteredSecrets(): KeyVaultSecret[] {
    const q = this.searchQuery.trim().toLowerCase();

    let result = this.allSecrets.filter(s => {
      const matchesSearch = !q || [
        s.secretName,
        s.vaultName,
        s.environmentName,
        s.contentType
      ].some(v => v?.toLowerCase().includes(q));

      const matchesEnv = !this.filterEnvironment || s.environmentName === this.filterEnvironment;
      const matchesVault = !this.filterVault || s.vaultName === this.filterVault;
      const matchesEnabled =
        this.filterEnabled === '' ||
        (this.filterEnabled === 'true' && s.enabled) ||
        (this.filterEnabled === 'false' && !s.enabled);

      return matchesSearch && matchesEnv && matchesVault && matchesEnabled;
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

  private getSortValue(s: KeyVaultSecret): string {
    return (s[this.sortField] ?? '').toString().toLowerCase();
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
    this.filterVault = '';
    this.filterEnabled = '';
  }

  get activeFilterCount(): number {
    return [this.searchQuery, this.filterEnvironment, this.filterVault, this.filterEnabled]
      .filter(Boolean).length;
  }

  get groupedByEnvironment(): { env: string; secrets: KeyVaultSecret[] }[] {
    const map = new Map<string, KeyVaultSecret[]>();
    for (const s of this.filteredSecrets) {
      const key = s.environmentName || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([env, secrets]) => ({ env, secrets }));
  }

  getVaultsForGroup(secrets: KeyVaultSecret[]): string[] {
    return [...new Set(secrets.map(s => s.vaultName))].sort();
  }

  getSecretsForVault(secrets: KeyVaultSecret[], vault: string): KeyVaultSecret[] {
    return secrets.filter(s => s.vaultName === vault);
  }

  // View toggle: 'table' | 'grouped'
  viewMode: 'table' | 'grouped' = 'table';

  toggleReveal(secret: KeyVaultSecret): void {
    if (this.revealedSecrets.has(secret)) {
      this.revealedSecrets.delete(secret);
    } else {
      this.revealedSecrets.add(secret);
    }
  }

  isRevealed(secret: KeyVaultSecret): boolean {
    return this.revealedSecrets.has(secret);
  }

  maskValue(value: string): string {
    if (!value) return '••••••••';
    if (value.length <= 4) return '••••••••';
    return '••••••••' + value.slice(-4);
  }
}
