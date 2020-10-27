import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather';
import { DragDropModule } from '@angular/cdk/drag-drop';
import {
	MatIconModule, MatGridListModule, MatButtonModule, MatTabsModule, MatInputModule, MatChipsModule,
	MatToolbarModule, MatDialogModule, MatButtonToggleModule, MatTooltipModule
} from '@angular/material';

import { MalihuScrollbarModule } from 'ngx-malihu-scrollbar';
import { MarkdownModule, MarkedOptions, MarkedRenderer } from 'ngx-markdown';
import { File, FileText, Code, Clock, Tag, Image, List } from 'angular-feather/icons';

import { MenuModule } from 'app/menu/menu.module';
import { AuthGuard } from 'app/services/auth/auth.guard';
import { NotesRootComponent } from 'app/notes/notes-root/notes-root.component';
import { DocEditorComponent } from 'app/notes/doc-editor/doc-editor.component';
import { NotesListComponent } from 'app/notes/notes-list/notes-list.component';
import { ListOverlayComponent } from 'app/notes/list-overlay/list-overlay.component';
import { BlockListItemComponent } from 'app/notes/block-list-item/block-list-item.component';
import { BlocksListComponent, BlocksListItem } from 'app/notes/blocks-list/blocks-list.component';
import { MarkdownEditorComponent } from 'app/components/markdown-editor/markdown-editor.component';
import { MarkdownBlockComponent } from 'app/notes/doc-editor/blocks/markdown-block/markdown-block.component';
import { PlaceholderBlockComponent } from 'app/notes/doc-editor/blocks/placeholder-block/placeholder-block.component';

const icons = { File, FileText, Code, Clock, Tag, Image, List };

const notesRoutes = [
	{
		path: 'notes',
		component: NotesRootComponent,
		canActivate: [AuthGuard],
		canActivateChild: [AuthGuard],
		children: [
			{ path: 'new', component: DocEditorComponent },
			{ path: ':name', component: NotesListComponent },
			{ path: '', redirectTo: "/notes/all", pathMatch: 'full' }
		]
	}
];

export function markedOptionsFactory(): MarkedOptions {
	const renderer = new MarkedRenderer();

	renderer.paragraph = (text: string) => {
		return '<p class="md-p">' + text + '</p>';
	};
	return {
		renderer: renderer,
		gfm: true,
		tables: true,
		breaks: false,
		pedantic: false,
		sanitize: true,
		smartLists: false,
		smartypants: false,
	};
}


@NgModule({
	declarations: [
		BlocksListItem,
		DocEditorComponent,
		NotesRootComponent,
		NotesListComponent,
		BlocksListComponent,
		ListOverlayComponent,
		BlockListItemComponent,
		MarkdownBlockComponent,
		MarkdownEditorComponent,
		PlaceholderBlockComponent,		
	],
	imports: [
		MenuModule,
		FormsModule,
		CommonModule,
		MatTabsModule,
		MatIconModule,
		DragDropModule,
		MatInputModule,
		MatChipsModule,
		MatDialogModule,
		MatButtonModule,
		MatToolbarModule,
		MatTooltipModule,
		MatGridListModule,
		MatButtonToggleModule,
		FeatherModule.pick(icons),
		MalihuScrollbarModule.forRoot(),
		RouterModule.forChild(notesRoutes),
		MarkdownModule.forRoot({ markedOptions: { provide: MarkedOptions, useFactory: markedOptionsFactory } }),
	],
	entryComponents: [DocEditorComponent, ListOverlayComponent, BlocksListComponent, BlockListItemComponent, MarkdownBlockComponent, PlaceholderBlockComponent],
})
export class NotesModule { }
