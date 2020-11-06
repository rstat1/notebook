import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
	MatCardModule, MatInputModule, MatButtonModule, MatCheckboxModule,
	MatTableModule, MatSnackBarModule, MatIconModule, MatPaginatorModule,
	MatSelectModule, MatListModule, MatTooltipModule, MatProgressSpinnerModule
} from '@angular/material';
import { MatRadioModule } from '@angular/material/radio';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AuthGuard } from 'app/services/auth/auth.guard';
import { MenuModule } from 'app/menu/menu.module';
import { MalihuScrollbarModule } from 'ngx-malihu-scrollbar';
import { AdminRootComponent } from 'app/admin/admin-root/admin-root.component';
import { AdminHomeComponent } from 'app/admin/admin-home/admin-home.component';
import { AdminImportComponent } from 'app/admin/admin-import/admin-import.component';
import { AdminAPITokenComponent } from 'app/admin/admin-apitoken/admin-apitoken.component';
import { APITokenDialogComponent } from 'app/admin/admin-apitoken/apitoken-dialog/apitoken-dialog.component';

const adminRoutes: Routes = [
	{
		path: "settings",
		component: AdminRootComponent,
		canActivate: [AuthGuard],
		canActivateChild: [AuthGuard],
		children: [
			{ path: '', component: AdminHomeComponent },
			{ path: 'tokens', component: AdminAPITokenComponent },
			{ path: 'project-import', component: AdminImportComponent },
		]
	}
];

const adminMenuItems = {
	Items: [
		//App
		{
			ItemTitle: "Home", ItemSubtext: "Return to home page", Icon: "settings",
			Category: "App", ActionName: "settings", RequiresRoot: false, MenuType: "admin"
		},
		{
			ItemTitle: "Access Tokens", ItemSubtext: "Create an access token for API access", Icon: "key",
			Category: "App", ActionName: "tokens", RequiresRoot: false, MenuType: "admin"
		},
		//Migration
		{
			ItemTitle: "Import Projects", ItemSubtext: "Import all projects from another service (ie. GitLab).",
			Icon: "import", Category: "Migration", ActionName: "project-import", RequiresRoot: true,
			MenuType: "admin"
		}

	]
};

@NgModule({
	imports: [
		MenuModule,
		FormsModule,
		CommonModule,
		MatCardModule,
		MatListModule,
		MatIconModule,
		MatRadioModule,
		MatInputModule,
		MatTableModule,
		MatSelectModule,
		MatButtonModule,
		MatTooltipModule,
		MatSnackBarModule,
		MatCheckboxModule,
		MatPaginatorModule,
		ReactiveFormsModule,
		BrowserAnimationsModule,
		MatProgressSpinnerModule,
		MalihuScrollbarModule.forRoot(),
		RouterModule.forChild(adminRoutes),
		MenuModule.forChild(adminMenuItems),
	],
	declarations: [
		AdminRootComponent,
		AdminHomeComponent,
		AdminImportComponent,
		AdminAPITokenComponent,
		APITokenDialogComponent,
	],
	providers: [],
	entryComponents: [APITokenDialogComponent]
})
export class AdminModule { }
