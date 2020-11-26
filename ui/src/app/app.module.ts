import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeatherModule } from 'angular-feather';
import { OverlayModule } from '@angular/cdk/overlay';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule, MatInputModule, MatIconModule, MatTooltipModule } from '@angular/material';

import { List, Trash2, FilePlus, Sliders } from 'angular-feather/icons';

import { NotesModule } from 'app/notes/notes.module';
import { AppRoutingModule } from 'app/app-routes.module';

import { AppComponent } from 'app/root';
import { MalihuScrollbarModule } from 'ngx-malihu-scrollbar';
import { AuthComponent } from 'app/components/auth/auth.component';
import { AuthGuard, RootGuard } from 'app/services/auth/auth.guard';
import { AuthTokenInjector } from 'app/services/api/AuthTokenInjector';

import { APIService } from 'app/services/api/api.service';
import { AuthService } from 'app/services/auth/auth.service';
import { NotebookListItemModule } from 'app/components/notebook-list-item/notebook-list-item.module';

const icons = { FilePlus, Trash2, List, Sliders };

@NgModule({
	declarations: [
		AppComponent,
		AuthComponent,
	],
	imports: [
		FormsModule,
		NotesModule,
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
	providers: [AuthService, APIService, AuthGuard, { provide: HTTP_INTERCEPTORS, multi: true, useClass: AuthTokenInjector }, RootGuard],
	bootstrap: [AppComponent],
})
export class AppModule {
	constructor() {

	}
}