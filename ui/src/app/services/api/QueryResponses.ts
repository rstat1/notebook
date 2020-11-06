export class NewAPIToken {
	public token: string;
}
export class APIToken {
	public name: string;
	public scopes: string;
	public creationDate: string;
}
export class DeleteToken {
	public tokens: APIToken[];
}
export class Page {
	public id: number;
	public title: string;
	public layout: string;
	public tags: PageTag[];
}
export class PageTag {
	public tagId: string;
	public tagValue: string;
}
export class NotebookReference {
	public id: string;
	public name: string;
}
export class PageReference {
	public id: string;
	public title: string;
	public tags: string[];
}
export class NewPageRequest {
	public page: Page;
	public notebookID: string;
	public content: string;
	constructor(pageMD: Page, notebook: string, pageContent: string) {
		this.page = pageMD;
		this.notebookID = notebook;
		this.content = btoa(pageContent);
	}
}

export class DeleteAPITokenRequest {
	public id: string;
	public creator: string;
	constructor(ID: string, Creator: string) {
		this.id = ID;
		this.creator = Creator;
	}
}