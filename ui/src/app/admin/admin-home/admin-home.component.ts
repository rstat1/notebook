import { MatDialog } from '@angular/material';
import { Component, OnInit } from '@angular/core';

import { MenuService } from 'app/services/menu.service';
import { APIService } from 'app/services/api/api.service';
import { AuthService } from 'app/services/auth/auth.service';

@Component({
	selector: 'app-admin-home',
	templateUrl: './admin-home.html',
	styleUrls: ['./admin-home.css']
})
export class AdminHomeComponent implements OnInit {
	public categories: string[];
	public projects: number = 0;
	public tasks: number = 0;
	public subtasks: number = 0;
	public groups: number = 0;
	public notes: number = 0;
	public diskSpace: number = 0;
	public commits: number = 0;
	public backupStatus: string;
	public backupDate: string;

	constructor(private auth: AuthService, public menu: MenuService, public api: APIService,
		private dialog: MatDialog,) { }

	ngOnInit() {

	}
	public showLog() {
		// this.dialog.open(StatusDialogComponent, {
		// 	minWidth: '500px',
		// 	data: { title: "Backup Log", subject: "BACKUPMSG" },
		// })
	}
}
