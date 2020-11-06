import { Router } from '@angular/router';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';

import { Sliders, Plus } from 'angular-feather/icons';

import { MenuService } from 'app/services/menu.service';
import { APIService } from 'app/services/api/api.service';
import { AuthService } from 'app/services/auth/auth.service';
import { NotebookReference } from 'app/services/api/QueryResponses';

@Component({
	selector: 'components-home',
	templateUrl: './home.html',
	styleUrls: ['./home.css']
})
export class Home implements OnInit {
	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};
	public notebooks: NotebookReference[];

	constructor(public authService: AuthService, private api: APIService, private router: Router, private menu: MenuService,
		private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) { }

	ngOnInit(): void {
		this.matIconRegistry.addSvgIconLiteral("feather_sliders", this.domSanitizer.bypassSecurityTrustHtml(Sliders));
		this.matIconRegistry.addSvgIconLiteral("feather_plus", this.domSanitizer.bypassSecurityTrustHtml(Plus));

		this.menu.SetMenuContext("home", "");
		this.api.GetNotebookRefs().subscribe(resp => {
			if (resp.status == "success") {
				this.notebooks = JSON.parse(resp.response);
			}
		});
	}
}