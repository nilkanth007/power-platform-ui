import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
  searchQuery = '';
  currentMatchIndex = -1;

  constructor(
    private route: ActivatedRoute,
    private ppService: PowerPlatformService,
    private sanitizer: DomSanitizer
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

  get highlightedJson(): SafeHtml {
    if (!this.definitionJson) {
      return '';
    }
    const escapedJson = this.escapeHtml(this.definitionJson);
    const query = this.searchQuery.trim();
    if (!query) {
      return this.sanitizer.bypassSecurityTrustHtml(escapedJson);
    }
    const escapedQuery = this.escapeHtml(query);
    const regex = new RegExp(this.escapeRegExp(escapedQuery), 'gi');
    
    let matchIdx = 0;
    const highlighted = escapedJson.replace(regex, match => {
      const idx = matchIdx++;
      const isCurrent = idx === this.currentMatchIndex;
      return `<mark id="match-${idx}" class="search-match ${isCurrent ? 'current-match' : ''}">${match}</mark>`;
    });
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  getMatchIndices(): number[] {
    if (!this.definitionJson || !this.searchQuery.trim()) {
      return [];
    }
    const query = this.searchQuery.trim().toLowerCase();
    const text = this.definitionJson.toLowerCase();
    const indices: number[] = [];
    let pos = text.indexOf(query);
    while (pos !== -1) {
      indices.push(pos);
      pos = text.indexOf(query, pos + query.length);
    }
    return indices;
  }

  get matchCount(): number {
    return this.getMatchIndices().length;
  }

  onSearchChange(): void {
    const count = this.matchCount;
    if (count > 0) {
      this.currentMatchIndex = 0;
      this.scrollToMatch();
    } else {
      this.currentMatchIndex = -1;
    }
  }

  nextMatch(): void {
    const indices = this.getMatchIndices();
    const count = indices.length;
    if (count === 0) return;

    const preEl = document.querySelector('.definition-pre') as HTMLElement;
    let caretPos = -1;
    if (preEl) {
      caretPos = this.getCaretCharacterOffsetWithin(preEl);
    }

    if (caretPos > 0) {
      const nextIdx = indices.findIndex(pos => pos > caretPos);
      if (nextIdx !== -1) {
        this.currentMatchIndex = nextIdx;
      } else {
        this.currentMatchIndex = 0;
      }
    } else {
      this.currentMatchIndex = (this.currentMatchIndex + 1) % count;
    }

    this.scrollToMatch();
  }

  prevMatch(): void {
    const indices = this.getMatchIndices();
    const count = indices.length;
    if (count === 0) return;

    const preEl = document.querySelector('.definition-pre') as HTMLElement;
    let caretPos = -1;
    if (preEl) {
      caretPos = this.getCaretCharacterOffsetWithin(preEl);
    }

    if (caretPos > 0) {
      let prevIdx = -1;
      for (let i = indices.length - 1; i >= 0; i--) {
        if (indices[i] < caretPos) {
          prevIdx = i;
          break;
        }
      }
      if (prevIdx !== -1) {
        this.currentMatchIndex = prevIdx;
      } else {
        this.currentMatchIndex = count - 1;
      }
    } else {
      this.currentMatchIndex = (this.currentMatchIndex - 1 + count) % count;
    }

    this.scrollToMatch();
  }

  private getCaretCharacterOffsetWithin(element: HTMLElement): number {
    let caretOffset = 0;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
  }

  private scrollToMatch(): void {
    setTimeout(() => {
      const el = document.getElementById(`match-${this.currentMatchIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  onKeyDown(event: KeyboardEvent): void {
    const allowedKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown',
      'Shift', 'Control', 'Meta', 'Alt', 'Tab'
    ];

    const isCtrlCombo = (event.ctrlKey || event.metaKey) && 
      (event.key === 'c' || event.key === 'C' || event.key === 'a' || event.key === 'A');

    if (!allowedKeys.includes(event.key) && !isCtrlCombo) {
      event.preventDefault();
    }
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
