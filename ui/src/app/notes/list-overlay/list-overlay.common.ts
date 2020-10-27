import { TemplateRef, Type } from '@angular/core';

import { ICommandListEntry } from 'app/components/command-list/cmd-list-common';

export type IListOverlayChild = TemplateRef<any> | Type<any> | string;

export class IListOverlayConfig {
	listOrigin: HTMLElement;
	listElement: IListOverlayChild;
	listContent: ICommandListEntry[];
}