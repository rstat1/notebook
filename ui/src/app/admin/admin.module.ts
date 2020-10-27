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
import { WebSocketClient } from 'app/services/websocket.service';

import { MenuModule } from 'app/menu/menu.module';
import { MalihuScrollbarModule } from 'ngx-malihu-scrollbar';
import { AdminRootComponent } from 'app/admin/admin-root/admin-root.component';
import { AdminHomeComponent } from 'app/admin/admin-home/admin-home.component';
import { AdminB2ConfigComponent } from 'app/admin/admin-b2/admin-b2.component';
import { AdminImportComponent } from 'app/admin/admin-import/admin-import.component';
import { AdminRestoreComponent } from 'app/admin/admin-restore/admin-restore.component';
import { AdminAPITokenComponent } from 'app/admin/admin-apitoken/admin-apitoken.component';
import { AdminNewProjectComponent } from 'app/admin/admin-projects/new/new-project.component';
import { AdminEditProjectComponent } from 'app/admin/admin-projects/edit/admin-edit-project.component';
import { APITokenDialogComponent } from 'app/admin/admin-apitoken/apitoken-dialog/apitoken-dialog.component';
import { StatusDialogComponent } from 'app/admin/admin-status-dialog/status-dialog.component';

const adminRoutes: Routes = [
	{
		path: "settings",
		component: AdminRootComponent,
		canActivate: [AuthGuard],
		canActivateChild: [AuthGuard],
		children: [
			{ path: '', component: AdminHomeComponent },
			{ path: 'backup', component: AdminB2ConfigComponent },
			{ path: 'tokens', component: AdminAPITokenComponent },
			{ path: 'restore', component: AdminRestoreComponent },
			{ path: 'project-import', component: AdminImportComponent },
			{ path: 'new-project', component: AdminNewProjectComponent },
			{ path: 'edit-project', component: AdminEditProjectComponent }
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

		//Backup
		{
			ItemTitle: "Backup Settings", ItemSubtext: "Configure data backup", Icon: "cloud",
			Category: "Backup", ActionName: "backup", RequiresRoot: true, MenuType: "admin"
		},
		{
			ItemTitle: "Restore Backup", ItemSubtext: "Restore a backup", Icon: "restore",
			Category: "Backup", ActionName: "restore", RequiresRoot: true, MenuType: "admin"
		},

		//Project management
		{
			ItemTitle: "New Project", ItemSubtext: "Create a new project", Icon: "plus",
			Category: "Project Management", ActionName: "new-project", RequiresRoot: false, MenuType: "admin"
		},
		{
			ItemTitle: "Edit a Project", ItemSubtext: "Change a project's name or group", Icon: "pencil",
			Category: "Project Management", ActionName: "edit-project", RequiresRoot: false, MenuType: "admin"
		},
		// { ItemTitle: "Edit a Group", ItemSubtext: "Change group settings. Name, feature flags, etc.", Icon:"group-edit",
		// 	Category: "Project Management", ActionName:"edit-group", RequiresRoot: false, MenuType: "admin"},

		//Workspaces
		// { ItemTitle: "Manage Workspaces", ItemSubtext: "Manage existing Workspace", Icon: "settings",
		// 	Category: "Workspaces", ActionName: "edit-workspace", RequiresRoot: true, MenuType: "admin" },
		// { ItemTitle: "Create Workspace", ItemSubtext: "Create a new Workspace", Icon: "plus",
		// 	Category: "Workspaces", ActionName: "new-workspace", RequiresRoot: true, MenuType: "admin" },

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
		AdminRestoreComponent,
		StatusDialogComponent,
		AdminAPITokenComponent,
		AdminB2ConfigComponent,
		APITokenDialogComponent,
		AdminNewProjectComponent,
		AdminEditProjectComponent,
	],
	providers: [WebSocketClient],
	entryComponents: [APITokenDialogComponent, StatusDialogComponent]
})
export class AdminModule { }
