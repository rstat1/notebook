import { highlight } from 'highlight.js';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather';
import {
	MatIconModule, MatGridListModule, MatButtonModule, MatTabsModule, MatInputModule, MatChipsModule, MatTableModule,
	MatToolbarModule, MatDialogModule, MatButtonToggleModule, MatTooltipModule, MatMenuModule, MatCheckboxModule,
	MatPaginatorModule, MatSnackBarModule, MatAutocompleteModule, MAT_FORM_FIELD_DEFAULT_OPTIONS
} from '@angular/material';

import { MalihuScrollbarModule } from 'ngx-malihu-scrollbar';
import { MarkdownModule, MarkedOptions, MarkedRenderer } from 'ngx-markdown';
import { File, FileText, Code, Clock, Tag, Image, List, Bold, Italic, Link2, CheckSquare, Trash2, BookOpen } from 'angular-feather/icons';

import { AuthGuard } from 'app/services/auth/auth.guard';
import { NotesRootComponent } from 'app/notes/notes-root/notes-root.component';
import { DocEditorComponent } from 'app/notes/doc-editor/doc-editor.component';
import { NotesListComponent } from 'app/notes/notes-list/notes-list.component';
import { SharedNoteComponent } from 'app/notes/shared-note/shared-note.component';
import { SettingsPanelComponent } from 'app/notes/settings-panel/settings-panel.component';
import { APITokensComponent } from 'app/notes/settings-panel/apitokens/apitokens.component';
import { NotebookListItemModule } from 'app/components/notebook-list-item/notebook-list-item.module';
import { SharingSettingsComponent } from 'app/notes/settings-panel/sharing-settings/sharing-settings.component';
import { AreYouSureDialogComponent } from 'app/notes/notes-list/are-you-sure-dialog/are-you-sure-dialog.component';
import { NamePromptDialogComponent } from 'app/notes/notes-list/new-notebook-dialog/new-notebook-dialog.component';
import { SharingLinkDialogComponent } from 'app/notes/notes-list/sharing-link-dialog/sharing-link-dialog.component';

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
	}, { path: 'shared/:sharedID', component: SharedNoteComponent, pathMatch: 'full' },
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
		DocEditorComponent,
		NotesRootComponent,
		APITokensComponent,
		NotesListComponent,
		SharedNoteComponent,
		SettingsPanelComponent,
		SharingSettingsComponent,
		AreYouSureDialogComponent,
		NamePromptDialogComponent,
		SharingLinkDialogComponent,
	],
	imports: [
		FormsModule,
		CommonModule,
		MatTabsModule,
		MatIconModule,
		MatMenuModule,
		MatTableModule,
		MatInputModule,
		MatChipsModule,
		MatDialogModule,
		MatButtonModule,
		MatToolbarModule,
		MatTooltipModule,
		MatSnackBarModule,
		MatCheckboxModule,
		MatGridListModule,
		MatPaginatorModule,
		ReactiveFormsModule,
		MatAutocompleteModule,
		MatButtonToggleModule,
		NotebookListItemModule,
		FeatherModule.pick(icons),
		MalihuScrollbarModule.forRoot(),
		RouterModule.forChild(notesRoutes),
		MarkdownModule.forRoot({ markedOptions: { provide: MarkedOptions, useFactory: markedOptionsFactory } }),
	],
	providers: [
		{ provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { floatLabel: 'never' } }
	],
	entryComponents: [DocEditorComponent],
})
export class NotesModule { }
