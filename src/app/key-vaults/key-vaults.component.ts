import { Component, OnInit } from '@angular/core';
import { PowerPlatformService } from '../services/power-platform.service';
import { KeyVaultSecret } from '../models/power-platform.models';

@Component({
  selector: 'app-key-vaults',
  templateUrl: './key-vaults.component.html',
  styleUrls: ['./key-vaults.component.css']
})
export class KeyVaultsComponent implements OnInit {
  secrets: KeyVaultSecret[] = [];
  isLoading = true;
  error = '';
  searchQuery = '';
  revealedSecrets: Set<string> = new Set();

  constructor(private ppService: PowerPlatformService) {}

  ngOnInit(): void {
    this.ppService.getKeyVaultSecrets().subscribe({
      next: (data) => {
        this.secrets = data;
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
    if (!this.searchQuery) {
      return this.secrets;
    }
    const q = this.searchQuery.toLowerCase();
    return this.secrets.filter(s =>
      (s.secretName && s.secretName.toLowerCase().includes(q)) ||
      (s.vaultName && s.vaultName.toLowerCase().includes(q)) ||
      (s.environmentName && s.environmentName.toLowerCase().includes(q)) ||
      (s.environmentId && s.environmentId.toLowerCase().includes(q))
    );
  }

  toggleReveal(secretName: string): void {
    if (this.revealedSecrets.has(secretName)) {
      this.revealedSecrets.delete(secretName);
    } else {
      this.revealedSecrets.add(secretName);
    }
  }

  isRevealed(secretName: string): boolean {
    return this.revealedSecrets.has(secretName);
  }

  maskValue(value: string): string {
    if (!value || value.length <= 4) return '••••••••';
    return '••••••••' + value.slice(-4);
  }
}
