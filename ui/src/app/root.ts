import { Component } from '@angular/core';

@Component({
	selector: 'app-root',
	templateUrl: './root-layout/root.html',
	styleUrls: ['./root-layout/root.css']
})
export class AppComponent {
	constructor() {
		if (window.location.port == "4200") {
			document.title += "-dev";
		} else if (window.location.hostname.includes("dev-m")) {
			document.title += "-test";
		}
	}
}