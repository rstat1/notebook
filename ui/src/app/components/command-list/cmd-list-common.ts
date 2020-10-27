export interface ICommandListEntry {
	context?: any;
	itemTemplate: any;
	description: string;
	action: (extra: any) => void;
}
export interface ICommandListSource {
	itemSelected(item: ICommandListEntry): void;
	getCommandList(): ICommandListEntry[];
	filterCommandList(filter: string): ICommandListEntry[];
}
export interface ICommandList {
	clearList(): void;
	updateList(): void;
	hasItems(): boolean;
}