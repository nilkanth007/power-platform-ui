import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PowerPlatformService } from '../services/power-platform.service';
import { Flow } from '../models/power-platform.models';

@Component({
  selector: 'app-flows',
  templateUrl: './flows.component.html',
  styleUrls: ['./flows.component.css']
})
export class FlowsComponent implements OnInit {
  flows: Flow[] = [];
  envId = '';
  isLoading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private ppService: PowerPlatformService
  ) {}

  ngOnInit(): void {
    this.envId = this.route.snapshot.paramMap.get('envId') || '';
    if (this.envId) {
      this.loadFlows();
    } else {
      this.error = 'No environment ID provided.';
      this.isLoading = false;
    }
  }

  loadFlows(): void {
    this.ppService.getFlows(this.envId).subscribe({
      next: (data) => {
        this.flows = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load flows.';
        this.isLoading = false;
      }
    });
  }
}
