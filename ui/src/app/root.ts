import { Router } from '@angular/router';
import { Component, Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';

import { APIService } from 'app/services/api/api.service';
import { ConfigService } from 'app/services/config.service'
import { CommandListService } from 'app/components/command-list/command-list.service';
import { CommandListComponent } from 'app/components/command-list/command-list.component';

@Component({
	selector: 'app-root',
	templateUrl: './root-layout/root.html',
	styleUrls: ['./root-layout/root.css']
})
export class AppComponent {
	private knownActions: string[] = ["settings", "projects", "notes", "builds", "userprofile", "home"];
	constructor(private api: APIService, private router: Router, private injector: Injector, public cmdListSvc: CommandListService) {
		if (window.location.port == "4200") {
			document.title += "-dev";
		} else if (window.location.hostname.includes("dev-m")) {
			document.title += "-test";
		}
		const cmdList = createCustomElement(CommandListComponent, { injector });
		customElements.define("command-list", cmdList)
	}
}