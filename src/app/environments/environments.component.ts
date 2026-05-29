import { Component, OnInit } from '@angular/core';
import { PowerPlatformService } from '../services/power-platform.service';
import { Environment } from '../models/power-platform.models';

@Component({
  selector: 'app-environments',
  templateUrl: './environments.component.html',
  styleUrls: ['./environments.component.css']
})
export class EnvironmentsComponent implements OnInit {
  environments: Environment[] = [];
  isLoading = true;
  error = '';

  constructor(private ppService: PowerPlatformService) {}

  ngOnInit(): void {
    this.ppService.getEnvironments().subscribe({
      next: (data) => {
        this.environments = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load environments. Is the API running?';
        this.isLoading = false;
      }
    });
  }
}
