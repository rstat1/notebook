import { Component, ViewChild, ViewContainerRef, Input } from '@angular/core';
import { CommandListService } from 'app/components/command-list/command-list.service';
import { ICommandListEntry, ICommandList } from 'app/components/command-list/cmd-list-common';

@Component({ selector: 'command-list-item', template: "<span #itemHost></span>" })
export class CommandListItem {
	private hostedItem: any;
	@ViewChild("itemHost", { read: ViewContainerRef, static: true }) private itemHost: ViewContainerRef;

	constructor() { }
	@Input() set HostedItem(item: any) {
		if (typeof item !== "string") {
			this.hostedItem = item;
			this.itemHost.insert(this.hostedItem.hostView);
		}
	}
}

@Component({ selector: 'command-list', templateUrl: './command-list.html', styleUrls: ['./command-list.css'] })
export class CommandListComponent implements ICommandList {
	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};
	public cmds: ICommandListEntry[] = new Array();
	constructor(public cmdList: CommandListService) {
		cmdList.setCommandListInstance(this);
	}
	public itemClick(cmd: ICommandListEntry) {
		this.cmdList.click(cmd);
		// this.cmdList.
		// if (cmd.context != null) { cmd.action(cmd.context); }
		// else { cmd.action(null); }
		// this.cmdList.hide();
	}
	public clearList(): void {
		this.cmds = new Array();
	}
	public updateList(): void {
		if (this.cmdList.currentSource != undefined && this.cmds.length == 0) {
			this.cmds = this.cmdList.currentSource.getCommandList();
		}
	}
	public hasItems(): boolean { return this.cmds.length != 0; }
}
