import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Injectable, Injector, ElementRef } from '@angular/core';
import { ComponentPortal } from '@angular/cdk/portal';
import { NgElement, WithProperties } from '@angular/elements';

import { CommandListComponent } from 'app/components/command-list/command-list.component';
import { ICommandListSource, ICommandList, ICommandListEntry } from 'app/components/command-list/cmd-list-common';

@Injectable({ providedIn: 'root' })
export class CommandListService {
	public currentSource: ICommandListSource;
	private overlayRef: OverlayRef;
	private listComponent: ICommandList;
	private isOverlayList: Boolean = false;
	// private cmdListPortal: ComponentPortal<CommandListComponent>;
	private cmdListElement: NgElement & WithProperties<CommandListComponent>;

	constructor(private overlay: Overlay, private injector: Injector) { }

	public show(commandSource: ICommandListSource) {
		var container: HTMLElement;
		this.currentSource = commandSource;
		if (this.cmdListElement == null) {
			this.cmdListElement = document.createElement("command-list") as any;
			document.body.appendChild(this.cmdListElement);
			container = document.getElementById("widget-container");
		} else {
			container = document.getElementById("widget-container");
			if (this.listComponent.hasItems() == false) { this.listComponent.updateList(); }
		}
		container.style.display = "block";
		container.addEventListener('focusout', this.handleUnFocus);
		container.focus();
	}
	public showAsOverlay(commandSource: ICommandListSource, overlayOrigin: ElementRef) {
		// this.isOverlayList = true;
		// console.log(this.overlayRef)
		// if (this.overlayRef == null) {
		// 	this.overlayRef = this.overlay.create({
		// 		positionStrategy: this.overlay.position().flexibleConnectedTo(overlayOrigin)
		// 			.withPositions([{overlayX: 'start', overlayY:'center', originX:'start', originY:'center'}]),
		// 	});
		// }
		// this.showOverlay(commandSource);
	}
	public hide() {
		if (this.isOverlayList == false) {
			let container = document.getElementById("widget-container");
			container.style.display = "none";
		} else {
			this.overlayRef.detach();
			this.isOverlayList = false;
			// this.overlayRef = null;
		}
		this.currentSource = null;
	}
	public click(item: ICommandListEntry) {
		this.currentSource.itemSelected(item);
		this.hide();
	}
	public setCommandListInstance(inst: ICommandList) {
		this.listComponent = inst;
		this.listComponent.updateList();
	}
	public clearCommandList() {
		if (this.listComponent != null) {
			this.listComponent.clearList();
		}
	}
	private showOverlay(cmdSrc: ICommandListSource) {
		// if (this.overlayRef.hasAttached() == false) {
		// 	if (this.cmdListPortal == null) {
		// 		this.cmdListPortal = new ComponentPortal(CommandListComponent);
		// 	}
		// 	this.currentSource = cmdSrc;
		// 	this.overlayRef.attach(this.cmdListPortal);
		// 	let container = document.getElementById("widget-container");
		// 	container.style.marginLeft = "0px";
		// 	this.setEventHandlers();
		// }
	}
	private handleUnFocus(e: FocusEvent) {
		let container = document.getElementById("widget-container");
		let scrollbox = document.getElementById("scrollbox");
		const relatedTarget = e.relatedTarget as HTMLElement;

		if (relatedTarget == undefined || (relatedTarget.parentElement != scrollbox && relatedTarget.parentElement != container)) {
			container.style.display = "none";
			this.currentSource = null;
		}
	}
	private setEventHandlers() {
		setTimeout(() => {
			let onClickHandler = (ev: MouseEvent): any => {
				let currentElement: HTMLElement = event.target as HTMLElement;
				let clickOnOverlay = false;
				while (currentElement && !clickOnOverlay) {
					if (currentElement === this.overlayRef.overlayElement) {
						clickOnOverlay = true;
					} else {
						currentElement = currentElement.parentElement;
					}
				}
				if (!clickOnOverlay) {
					document.removeEventListener("click", onClickHandler);
					this.overlayRef.detach();
					this.isOverlayList = false;
					// this.overlayRef = null;
				}
			};
			document.addEventListener('click', onClickHandler);
		}, 0);
	}
}
