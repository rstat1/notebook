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
	public tags: PageTag[];
	public creator: string;
	public lastEdited: number;
}
export class PageTag {
	public tagId: string;
	public tagValue: string;
}
export class NotebookReference {
	public id: string;
	public name: string;
}
export class NewPageMetadata {
	public tags: string[];
	public title: string;
	public lastEdited: number;
}
export class NewPageRequest {
	public page: NewPageMetadata;
	public notebookID: string;
	constructor(pageMD: NewPageMetadata, notebook: string) {
		this.page = pageMD;
		this.notebookID = notebook;
	}
}
export class NewPageResponse {
	public page: Page;
	public error: string;
	public successful: boolean;
	constructor(status: string, pageMD?: Page, error?: string) {
		this.page = pageMD;
		this.error = error;
		this.successful = status == "success" ? true : false;
	}
}
export class NewAPITokenRequest {
	public scopes: string;
	public description: string;
	constructor(Scopes: string, Description: string) {
		this.scopes = Scopes;
		this.description = Description;
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