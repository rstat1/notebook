import { NgModule } from '@angular/core';
import { FeatherModule } from 'angular-feather';
import { MatIconModule } from '@angular/material';
import { MalihuScrollbarModule } from 'ngx-malihu-scrollbar';
import { NotebookListItemComponent } from 'app/components/notebook-list-item/notebook-list-item.component';

import { List, Trash2, FilePlus, Sliders } from 'angular-feather/icons';

const icons = { FilePlus, Trash2, List, Sliders };

@NgModule({
    declarations: [NotebookListItemComponent],
    imports: [
        MatIconModule,
        FeatherModule.pick(icons),
        MalihuScrollbarModule.forRoot(),
    ],
    exports: [NotebookListItemComponent],
})
export class NotebookListItemModule { }