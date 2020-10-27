import { Router } from '@angular/router';
import { Component, OnInit, ViewChild } from '@angular/core';

import { MenuService } from 'app/services/menu.service';
import { Project } from 'app/services/api/QueryResponses';
import { APIService } from 'app/services/api/api.service';
import { AuthService } from 'app/services/auth/auth.service';

@Component({
	selector: 'components-home',
	templateUrl: './home.html',
	styleUrls: ['./home.css']
})
export class Home implements OnInit {
	constructor(public authService: AuthService, private api: APIService, private router: Router,
				private menu: MenuService) {}
	ngOnInit(): void {
		this.menu.SetMenuContext("home", "");
	}
}