import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { RouterModule, Routes } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { MatButtonModule, MatInputModule } from '@angular/material';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MenuModule } from 'app/menu/menu.module';
import { NotesModule } from 'app/notes/notes.module';
import { AdminModule } from 'app/admin/admin.module';

import { AppComponent } from 'app/root';
import { Home } from 'app/components/home/home';
import { MalihuScrollbarModule } from 'ngx-malihu-scrollbar';
import { AuthComponent } from 'app/components/auth/auth.component';
import { AuthGuard, RootGuard } from 'app/services/auth/auth.guard';
import { AuthTokenInjector } from 'app/services/api/AuthTokenInjector';
import { CommandListComponent, CommandListItem } from 'app/components/command-list/command-list.component';

import { MenuService } from 'app/services/menu.service';
import { APIService } from 'app/services/api/api.service';
import { EventService } from 'app/services/event.service';
import { AuthService } from 'app/services/auth/auth.service';
import { GraphQLService } from 'app/services/graphql.service';
import { HeaderInfoService } from 'app/services/header-info.service';
import { CommandListService } from 'app/components/command-list/command-list.service';

const appRoutes: Routes = [
	{ path: 'auth', component: AuthComponent, pathMatch: "full" },
	{ path: 'home', redirectTo: "/notes", canActivate: [AuthGuard] },
	{ path: 'notes', loadChildren: () => import('app/notes/notes.module').then(m => m.NotesModule), canActivate: [AuthGuard] },
	{ path: 'settings', loadChildren: () => import('app/admin/admin.module').then(m => m.AdminModule), canActivate: [RootGuard] },
	{ path: '', redirectTo: "/notes", pathMatch: 'full' }
];

const appMenuItems = {
	Items: [
		{
			ItemTitle: "Notes", ItemSubtext: "View or edit Wiki entries", Icon: "wiki", Category: "App",
			ActionName: "notes", RequiresRoot: false, MenuType: "app"
		},
		{
			ItemTitle: "New Notebook", ItemSubtext: "Create a new notebook", Icon: "plus", Category: "App",
			ActionName: "notebooknew", RequiresRoot: false, MenuType: "app"
		},
		{
			ItemTitle: "Delete Notebook", ItemSubtext: "Delete this notebook", Icon: "delete", Category: "Notebook",
			Context: "notebook", ActionName: "delete", RequiresRoot: false, MenuType: "notebook"
		},

	]
};

@NgModule({
	declarations: [
		Home,
		AppComponent,
		AuthComponent,
		CommandListItem,
		CommandListComponent,
	],
	imports: [
		FormsModule,
		NotesModule,
		AdminModule,
		CommonModule,
		OverlayModule,
		BrowserModule,
		MatInputModule,
		MatButtonModule,
		HttpClientModule,
		BrowserAnimationsModule,
		MalihuScrollbarModule.forRoot(),
		MenuModule.forRoot(appMenuItems),
		RouterModule.forRoot(appRoutes, { enableTracing: false })
	],
	providers: [AuthService, APIService, AuthGuard, GraphQLService, HeaderInfoService, { provide: HTTP_INTERCEPTORS, multi: true, useClass: AuthTokenInjector },
		MenuService, RootGuard, EventService, CommandListService],
	bootstrap: [AppComponent],
	entryComponents: [CommandListComponent]
})
export class AppModule {
	constructor() {

	}
}