import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router'; // CLI imports router

import { AuthComponent } from 'app/components/auth/auth.component';
import { AuthGuard, RootGuard } from 'app/services/auth/auth.guard';

const routes: Routes = [
	{ path: 'auth', component: AuthComponent, pathMatch: "full" },
	{ path: 'home', redirectTo: "/nb", canActivate: [AuthGuard] },
	{ path: 'nb', loadChildren: () => import('app/notes/notes.module').then(m => m.NotesModule), canActivate: [AuthGuard] },
	{ path: 'settings', loadChildren: () => import('app/admin/admin.module').then(m => m.AdminModule), canActivate: [RootGuard] },
	{ path: '', redirectTo: "/nb", pathMatch: 'full' }
];

@NgModule({
	imports: [
		RouterModule.forRoot(routes)
	],
	exports: [RouterModule]
})
export class AppRoutingModule { }