import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { combineLatest, of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';

import { APP_CONFIG, AppConfig } from 'src/config/app-config.interface';
import { BrowseByMetadataComponent as BaseComponent } from '../../../../../app/browse-by/browse-by-metadata/browse-by-metadata.component';
import { ThemedBrowseByComponent } from '../../../../../app/shared/browse-by/themed-browse-by.component';
import { ThemedLoadingComponent } from '../../../../../app/shared/loading/themed-loading.component';

import { BrowseEntrySearchOptions } from '../../../../../app/core/browse/browse-entry-search-options.model';
import { PaginationComponentOptions } from '../../../../../app/shared/pagination/pagination-component-options.model';
import { SortDirection, SortOptions } from '../../../../../app/core/cache/models/sort-options.model';

export interface MediaCategory {
  label: string;
  icon: string;
}

export interface BrowseEntryItem {
  value: string;
  count: number;
}

const CATEGORY_PATTERNS: Record<string, RegExp> = {
  'Image':    /\.(jpg|jpeg|png|gif|bmp|tif|tiff|webp|svg|ico)$/i,
  'Document': /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt|ods|odp|csv)$/i,
  'Audio':    /\.(mp3|wav|ogg|flac|aac|m4a|wma|opus)$/i,
  'Video':    /\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v)$/i,
  'Zip':      /\.(zip|tar|gz|rar|7z|bz2)$/i,
};

@Component({
  selector: 'ds-browse-by-metadata',
  styleUrls: ['./browse-by-metadata.component.scss'],
  templateUrl: './browse-by-metadata.component.html',
  imports: [
    AsyncPipe,
    DecimalPipe,
    RouterLink,
    ThemedBrowseByComponent,
    ThemedLoadingComponent,
    TranslateModule,
  ],
})
export class BrowseByMetadataComponent extends BaseComponent {

  private readonly restConfig = inject<AppConfig>(APP_CONFIG);
  private readonly activatedRoute = inject(ActivatedRoute);

  private static readonly BROWSE_LABELS: Record<string, string> = {
    author: 'Author',
    title: 'Title',
    subject: 'Subject',
    language: 'Language',
    media: 'Media',
    linguistictype: 'Linguistic Data Type',
  };

  readonly mediaCategories: MediaCategory[] = [
    { label: 'Image',    icon: 'fas fa-image' },
    { label: 'Document', icon: 'fas fa-file-alt' },
    { label: 'Audio',    icon: 'fas fa-music' },
    { label: 'Video',    icon: 'fas fa-video' },
    { label: 'Zip',      icon: 'fas fa-file-archive' },
  ];

  mediaCounts: Record<string, number> = {};
  browseEntries: BrowseEntryItem[] = [];
  selectedCategory: string | null = null;

  get categoryEntries(): BrowseEntryItem[] {
    if (!this.selectedCategory) { return []; }
    const pattern = CATEGORY_PATTERNS[this.selectedCategory];
    return this.browseEntries.filter(e => pattern?.test(e.value));
  }

  override ngOnInit(): void {
    super.ngOnInit();

    // Track selected category from query params
    this.activatedRoute.queryParams.subscribe(qp => {
      this.selectedCategory = qp['cat'] ?? null;
    });
  }

  override updatePage(searchOptions: BrowseEntrySearchOptions): void {
    super.updatePage(searchOptions);
    this.triggerFetchMediaStats();
  }

  override updatePageWithItems(searchOptions: BrowseEntrySearchOptions, value: string, authority: string): void {
    super.updatePageWithItems(searchOptions, value, authority);
    this.triggerFetchMediaStats();
  }

  private triggerFetchMediaStats(): void {
    if (this.browseId === 'media' || this.router.url.includes('/media')) {
      this.fetchMediaStats();
    }
  }

  fetchMediaStats(): void {
    let scopeStr = this.scope;
    if (!scopeStr) {
      const urlSegments = this.router.url.split('?')[0].split('/');
      const commIdx = urlSegments.indexOf('communities');
      const collIdx = urlSegments.indexOf('collections');
      if (commIdx !== -1 && urlSegments.length > commIdx + 1) {
        scopeStr = urlSegments[commIdx + 1];
      } else if (collIdx !== -1 && urlSegments.length > collIdx + 1) {
        scopeStr = urlSegments[collIdx + 1];
      }
    }
    
    const paginationConfig = Object.assign(new PaginationComponentOptions(), { id: 'media-ext', currentPage: 1, pageSize: 500 });
    const sortConfig = new SortOptions('default', SortDirection.ASC);
    const searchOptions = new BrowseEntrySearchOptions('media', paginationConfig, sortConfig, undefined, scopeStr, false);

    this.browseService.getBrowseEntriesFor(searchOptions).subscribe({
      next: (rd: any) => {
        if (rd.hasSucceeded && rd.payload && rd.payload.page) {
          const entries = rd.payload.page;
          this.browseEntries = entries.map((e: any) => ({
            value: e.value,
            count: e.count ?? 0,
          }));
          this.mediaCounts = {};
          Object.keys(CATEGORY_PATTERNS).forEach(label => {
            const pattern = CATEGORY_PATTERNS[label];
            this.mediaCounts[label] = this.browseEntries
              .filter(e => pattern.test(e.value))
              .reduce((sum, e) => sum + e.count, 0);
          });
        } else if (rd.hasFailed) {
          this.browseEntries = [];
          this.mediaCounts = { 'Image': 0, 'Document': 0, 'Audio': 0, 'Video': 0, 'Zip': 0 };
        }
      },
      error: () => {
        this.browseEntries = [];
        this.mediaCounts = { 'Image': 0, 'Document': 0, 'Audio': 0, 'Video': 0, 'Zip': 0 };
      }
    });
  }

  getBrowseLabel(): string {
    return BrowseByMetadataComponent.BROWSE_LABELS[this.browseId] ?? this.browseId;
  }
}
