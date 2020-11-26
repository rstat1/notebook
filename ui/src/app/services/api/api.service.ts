import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs';
import { ConfigService } from "app/services/config.service";
import { APIToken, DeleteAPITokenRequest, NewAPITokenRequest, NewPageRequest } from 'app/services/api/QueryResponses';

export class AuthRequest {
	public Username: string;
	public Password: string;
	constructor(username: string, password: string) {
		this.Username = username;
		this.Password = password;
	}
}
export interface APIResponse {
	status: string;
	response: string;
}
export class NewProject {
	public Name: string;
	public Group: string;
	public AllowsBuildConfig: boolean;
}

@Injectable()
export class APIService {
	constructor(private http: HttpClient) { }
	public ValidateToken(): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetTokenValidateURL());
	}
	public GetAuthToken(code: string): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("auth/token?code=" + code));
	}
	public GetAPIKeys(): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("apikeys"));
	}
	public GetNotebookRefs(): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("notebooks"));
	}
	public GetTags(): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("tags"));
	}
	public GetPageMetadata(pageID: string, notebookID: string): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("notebook/" + notebookID + "/page/" + pageID));
	}
	public GetPageContent(pageID: string, notebookID: string): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("notebook/" + notebookID + "/pagecontent/" + pageID));
	}
	public GetPages(notebookID: string): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("notebook/" + notebookID));
	}
	public GetAPITokens(): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("user/apikeys"));
	}
	public GetSharedPage(id: string): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("sharing/" + id))
	}
	public GetSharedPages(): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("sharing/allshared"))
	}
	public FilterNotesByTags(tags: string[], notebookID: string): Observable<APIResponse> {
		return this.http.post<APIResponse>(ConfigService.GetAPIURLFor("notebook/" + notebookID + "/withtags"), JSON.stringify(tags))
	}
	public NewPage(newPage: FormData): Observable<APIResponse> {
		return this.postFormRequest(ConfigService.GetAPIURLFor("notebook/page"), newPage)
	}
	public NewTag(tagName: string): Observable<APIResponse> {
		return this.http.post<APIResponse>(ConfigService.GetAPIURLFor("tags/new"), tagName);
	}
	public NewNotebook(name: string): Observable<APIResponse> {
		return this.http.post<APIResponse>(ConfigService.GetAPIURLFor("notebook/new"), name);
	}
	public NewAPIToken(request: NewAPITokenRequest): Observable<APIResponse> {
		return this.http.post<APIResponse>(ConfigService.GetAPIURLFor("user/apikey/new"), JSON.stringify(request));
	}
	public NewSharedPage(pageID: string, notebookID: string, title: string): Observable<APIResponse> {
		return this.http.post<APIResponse>(ConfigService.GetAPIURLFor("sharing/share"), JSON.stringify({ "page": pageID, "notebook": notebookID, "title": title }));
	}
	public DeleteAPIToken(tokenID: string, creator: string): Observable<APIResponse> {
		return this.deleteRequest<DeleteAPITokenRequest>(new DeleteAPITokenRequest(tokenID, creator), "user/apikey");
	}
	public DeletePage(pageID: string, notebookID: string): Observable<APIResponse> {
		return this.http.delete<APIResponse>(ConfigService.GetAPIURLFor("notebook/" + notebookID + "/ripout/" + pageID));
	}
	public DeleteNotebook(notebookID: string): Observable<APIResponse> {
		return this.http.delete<APIResponse>(ConfigService.GetAPIURLFor("notebook/" + notebookID + "/burn"));
	}
	public DeleteTag(tagID: string): Observable<APIResponse> {
		return this.http.delete<APIResponse>(ConfigService.GetAPIURLFor("tags/delete/" + tagID));
	}
	public UnsharePage(id: string): Observable<APIResponse> {
		return this.http.delete<APIResponse>(ConfigService.GetAPIURLFor("sharing/unshare/" + id));
	}
	private deleteRequest<T>(requestInfo: T, route: string): Observable<APIResponse> {
		const options = {
			headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
			body: requestInfo,
		};
		return this.http.request<APIResponse>("delete", ConfigService.GetAPIURLFor(route), options);
	}
	private postFormRequest(url: string, body: FormData): Observable<APIResponse> {
		return this.http.post<APIResponse>(url, body);
	}
}