import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeatherModule } from 'angular-feather';
import { OverlayModule } from '@angular/cdk/overlay';
import { RouterModule, Routes } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule, MatInputModule, MatIconModule, MatTooltipModule } from '@angular/material';

import { List, Trash2, FilePlus, Sliders } from 'angular-feather/icons';

import { NotesModule } from 'app/notes/notes.module';
import { AdminModule } from 'app/admin/admin.module';

import { AppComponent } from 'app/root';
import { MalihuScrollbarModule } from 'ngx-malihu-scrollbar';
import { AuthComponent } from 'app/components/auth/auth.component';
import { AuthGuard, RootGuard } from 'app/services/auth/auth.guard';
import { AuthTokenInjector } from 'app/services/api/AuthTokenInjector';
import { CommandListComponent, CommandListItem } from 'app/components/command-list/command-list.component';

import { AppRoutingModule } from 'app/app-routes.module';
import { APIService } from 'app/services/api/api.service';
import { AuthService } from 'app/services/auth/auth.service';
import { CommandListService } from 'app/components/command-list/command-list.service';
import { NotebookListItemModule } from './components/notebook-list-item/notebook-list-item.module';

const icons = { FilePlus, Trash2, List, Sliders };

@NgModule({
	declarations: [
		AppComponent,
		AuthComponent,
		CommandListItem,
		CommandListComponent,
	],
	imports: [
		FormsModule,
		NotesModule,
		AdminModule,
		OverlayModule,
		BrowserModule,
		MatIconModule,
		MatInputModule,
		MatButtonModule,
		MatTooltipModule,
		HttpClientModule,
		AppRoutingModule,
		NotebookListItemModule,
		BrowserAnimationsModule,
		FeatherModule.pick(icons),
		MalihuScrollbarModule.forRoot(),
	],
	providers: [AuthService, APIService, AuthGuard, { provide: HTTP_INTERCEPTORS, multi: true, useClass: AuthTokenInjector },
		RootGuard, CommandListService],
	bootstrap: [AppComponent],
	entryComponents: [CommandListComponent]
})
export class AppModule {
	constructor() {

	}
}