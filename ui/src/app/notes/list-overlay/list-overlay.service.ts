import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Injectable, Injector, TemplateRef, Type } from '@angular/core';

import { ComponentPortal } from '@angular/cdk/portal';
import { ListOverlayComponent } from 'app/notes/list-overlay/list-overlay.component';
import { IListOverlayConfig } from 'app/notes/list-overlay/list-overlay.common';

@Injectable({ providedIn: 'root' })
export class ListOverlayService {
	private overlayRef: OverlayRef;
	private listInstance: ListOverlayComponent;

	constructor(private overlay: Overlay, private inject: Injector) { }
	public open(config: IListOverlayConfig): OverlayRef {
		this.overlayRef = this.overlay.create({
			hasBackdrop: true, backdropClass: 'transparent',
			positionStrategy: this.overlay.position().flexibleConnectedTo(config.listOrigin)
				.withPositions([{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top', offsetY: 5 }]),
		});

		const injector = Injector.create({ providers: [{ provide: 'listOverlayConfig', useValue: config }] });
		const portal = new ComponentPortal(ListOverlayComponent, null, injector);
		this.listInstance = this.overlayRef.attach(portal).instance;
		this.overlayRef.backdropClick().subscribe(() => { this.overlayRef.dispose(); });
		return this.overlayRef;
	}
	public filterList(filterText: string) {
		this.listInstance.filter(filterText);
	}
	public close() {
		this.overlayRef.dispose();
	}
}