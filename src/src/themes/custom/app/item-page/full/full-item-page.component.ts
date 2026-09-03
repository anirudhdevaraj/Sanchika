import {
  AsyncPipe,
  KeyValuePipe,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { Item } from '../../../../../app/core/shared/item.model';
import { ThemedItemAlertsComponent } from '../../../../../app/item-page/alerts/themed-item-alerts.component';
import { CollectionsComponent } from '../../../../../app/item-page/field-components/collections/collections.component';
import { ThemedFullFileSectionComponent } from '../../../../../app/item-page/full/field-components/file-section/themed-full-file-section.component';
import { FullItemPageComponent as BaseComponent } from '../../../../../app/item-page/full/full-item-page.component';
import { ThemedItemPageTitleFieldComponent } from '../../../../../app/item-page/simple/field-components/specific-field/title/themed-item-page-field.component';
import { ItemVersionsComponent } from '../../../../../app/item-page/versions/item-versions.component';
import { ItemVersionsNoticeComponent } from '../../../../../app/item-page/versions/notice/item-versions-notice.component';
import { fadeInOut } from '../../../../../app/shared/animations/fade';
import { DsoEditMenuComponent } from '../../../../../app/shared/dso-page/dso-edit-menu/dso-edit-menu.component';
import { ErrorComponent } from '../../../../../app/shared/error/error.component';
import { ThemedLoadingComponent } from '../../../../../app/shared/loading/themed-loading.component';
import { VarDirective } from '../../../../../app/shared/utils/var.directive';

@Component({
  selector: 'ds-themed-full-item-page',
  styleUrls: ['./full-item-page.component.scss'],
  templateUrl: './full-item-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInOut],
  imports: [
    AsyncPipe,
    CollectionsComponent,
    DsoEditMenuComponent,
    ErrorComponent,
    ItemVersionsComponent,
    ItemVersionsNoticeComponent,
    KeyValuePipe,
    RouterLink,
    ThemedFullFileSectionComponent,
    ThemedItemAlertsComponent,
    ThemedItemPageTitleFieldComponent,
    ThemedLoadingComponent,
    TranslateModule,
    VarDirective,
  ],
})
export class FullItemPageComponent extends BaseComponent {

  async downloadMetadataPdf(item: Item): Promise<void> {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const metadata = await firstValueFrom(this.metadata$);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const title = item.firstMetadataValue('dc.title') ?? 'Item';
    const displayTitle = title.length > 90 ? title.slice(0, 90) + '…' : title;

    doc.setFontSize(14);
    doc.setTextColor(26, 54, 93);
    doc.text(displayTitle, 14, 18);

    const handle = item.handle;
    if (handle) {
      const suffix = handle.split('/').pop();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${origin}/id/${suffix}`, 14, 24);
    }

    const rows: string[][] = [];
    for (const [key, values] of Object.entries(metadata ?? {})) {
      if (key === 'dc.identifier.uri') {
        continue;
      }
      for (const v of values) {
        rows.push([key, v?.value ?? '']);
      }
    }

    autoTable(doc, {
      head: [['Field', 'Value']],
      body: rows,
      startY: 30,
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [26, 54, 93], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    });

    const safeTitle = (title || 'item')
      .slice(0, 60)
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    doc.save(`${safeTitle || 'item'}_metadata.pdf`);
  }
}
