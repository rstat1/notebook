import { highlight } from 'highlight.js';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather';
import {
	MatIconModule, MatGridListModule, MatButtonModule, MatTabsModule, MatInputModule, MatChipsModule,
	MatToolbarModule, MatDialogModule, MatButtonToggleModule, MatTooltipModule, MatMenuModule
} from '@angular/material';

import { MalihuScrollbarModule } from 'ngx-malihu-scrollbar';
import { MarkdownModule, MarkedOptions, MarkedRenderer } from 'ngx-markdown';
import { File, FileText, Code, Clock, Tag, Image, List, Bold, Italic, Link2, CheckSquare, Trash2, BookOpen } from 'angular-feather/icons';

import { AuthGuard } from 'app/services/auth/auth.guard';
import { NotesRootComponent } from 'app/notes/notes-root/notes-root.component';
import { DocEditorComponent } from 'app/notes/doc-editor/doc-editor.component';
import { NotesListComponent } from 'app/notes/notes-list/notes-list.component';
import { ListOverlayComponent } from 'app/notes/list-overlay/list-overlay.component';
import { BlockListItemComponent } from 'app/notes/block-list-item/block-list-item.component';
import { BlocksListComponent, BlocksListItem } from 'app/notes/blocks-list/blocks-list.component';
import { NotebookListItemModule } from 'app/components/notebook-list-item/notebook-list-item.module';
import { AreYouSureDialogComponent } from './notes-list/are-you-sure-dialog/are-you-sure-dialog.component';
import { NamePromptDialogComponent } from './notes-list/new-notebook-dialog/new-notebook-dialog.component';

const icons = { File, FileText, Code, Clock, Tag, Image, List, Bold, Italic, Link2, CheckSquare, Trash2, BookOpen };

const notesRoutes = [
	{
		path: 'nb',
		component: NotesRootComponent,
		canActivate: [AuthGuard],
		canActivateChild: [AuthGuard],
		children: [
			{ path: '', component: NotesListComponent },
			{ path: 'new', component: DocEditorComponent },
			{ path: ':nbid', component: NotesListComponent, pathMatch: 'full' },
			{ path: ':nbid/page/:page', component: NotesListComponent, pathMatch: 'full' },

		]
	}
];

export function markedOptionsFactory(): MarkedOptions {
	const renderer = new MarkedRenderer();

	renderer.paragraph = (text: string) => {
		return '<p class="md-p">' + text + '</p>';
	};
	renderer.heading = (text: string, level: 2 | 3 | 4 | 6 | 1 | 5, raw: string, slugger: marked.Slugger) => {
		switch (level) {
			case 1:
				return "<h1>" + text + "</h1><hr/>";
			default:
				return "<h" + level + ">" + text + "</h" + level + ">";
		}
	}
	return {
		renderer: renderer,
		gfm: true,
		breaks: false,
		pedantic: false,
		smartLists: false,
		smartypants: false,
		highlight: (code, lang): string => {
			if (lang != "") { return highlight(lang, code, false).value; }
			else { return code; }
		},
	};
}

@NgModule({
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	declarations: [
		BlocksListItem,
		DocEditorComponent,
		NotesRootComponent,
		NotesListComponent,
		BlocksListComponent,
		ListOverlayComponent,
		BlockListItemComponent,
		AreYouSureDialogComponent,
		NamePromptDialogComponent,
	],
	imports: [
		FormsModule,
		CommonModule,
		MatTabsModule,
		MatIconModule,
		MatMenuModule,
		MatInputModule,
		MatChipsModule,
		MatDialogModule,
		MatButtonModule,
		MatToolbarModule,
		MatTooltipModule,
		MatGridListModule,
		MatButtonToggleModule,
		NotebookListItemModule,
		FeatherModule.pick(icons),
		MalihuScrollbarModule.forRoot(),
		RouterModule.forChild(notesRoutes),
		MarkdownModule.forRoot({ markedOptions: { provide: MarkedOptions, useFactory: markedOptionsFactory } }),
	],
	entryComponents: [DocEditorComponent, ListOverlayComponent, BlocksListComponent, BlockListItemComponent],
})
export class NotesModule { }
