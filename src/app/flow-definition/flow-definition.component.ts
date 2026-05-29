import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PowerPlatformService } from '../services/power-platform.service';
import { FlowDefinition } from '../models/power-platform.models';

@Component({
  selector: 'app-flow-definition',
  templateUrl: './flow-definition.component.html',
  styleUrls: ['./flow-definition.component.css']
})
export class FlowDefinitionComponent implements OnInit {
  envId = '';
  flowId = '';
  definition: FlowDefinition | null = null;
  definitionJson = '';
  isLoading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private ppService: PowerPlatformService
  ) {}

  ngOnInit(): void {
    this.envId = this.route.snapshot.paramMap.get('envId') || '';
    this.flowId = this.route.snapshot.paramMap.get('flowId') || '';
    
    if (this.envId && this.flowId) {
      this.loadDefinition();
    } else {
      this.error = 'Missing environment ID or flow ID.';
      this.isLoading = false;
    }
  }

  loadDefinition(): void {
    this.ppService.getFlowDefinition(this.envId, this.flowId).subscribe({
      next: (data) => {
        this.definition = data;
        this.definitionJson = JSON.stringify(data, null, 2);
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load flow definition.';
        this.isLoading = false;
      }
    });
  }
}
