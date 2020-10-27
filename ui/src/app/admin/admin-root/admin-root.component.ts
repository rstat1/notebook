import { Router, ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';

import { MenuService } from 'app/services/menu.service';
import { APIService } from 'app/services/api/api.service';
import { AuthService } from 'app/services/auth/auth.service';
import { WebSocketClient } from 'app/services/websocket.service';

@Component({
	selector: 'app-admin-root',
	templateUrl: './admin-root.html',
	styleUrls: ['./admin-root.css']
})
export class AdminRootComponent implements OnInit {
	public tasks: number;
	public groups: number;
	public projects: number;
	public backupDate: string;
	public categories: string[];
	public backupStatus: string;
	public pathExtra: string = "settings";
	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};
	public knownActions: string[] = [
		"restore", "backup", "new-project", "edit-project", "tokens", "project-import"
	];

	constructor(private auth: AuthService, public menu: MenuService, public api: APIService,
		public router: Router, public route: ActivatedRoute, private ws: WebSocketClient) {

		this.ws.Connect();
		this.pathExtra = window.location.pathname;
	}
	ngOnInit() {
		this.menu.SetMenuContext("admin", "");
		this.categories = this.menu.GetCategoryList();
		this.menu.MenuItemClicked.subscribe(action => {
			if (this.knownActions.includes(action)) {
				this.pathExtra = "/settings/"+action;
				this.router.navigate([action], { relativeTo: this.route });
			}
		});
	}
	public DoesUserHaveRoot(): boolean {
		return this.auth.UserIsRoot;
	}
	public doSomethingWithClick(clickedItemTitle: string) {
		this.menu.HandleMouseEvent(clickedItemTitle);
	}
}
