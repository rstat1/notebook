import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';

@Injectable()
export class ConfigService {
	private static ACCESS_TOKEN: string = "";
	private static SERVICE_ID: string = environment.FrostServiceID;
	private static API_ENDPOINT: string = ""; //environment.APIBaseURL;
	private static AUTH_ENDPOINT: string = "";

	constructor() { }

	public static GetWSURLFor(api: string): string {
		ConfigService.SetBaseURL("wss:");
		return ConfigService.API_ENDPOINT + "/ash/" + api;
	}
	public static GetAPIURLFor(api: string, queryVars: string = ""): string {
		ConfigService.SetBaseURL(window.location.protocol);
		return ConfigService.API_ENDPOINT + "/ash/" + api;
	}
	public static GetTrinityURLFor(api: string): string {
		ConfigService.SetBaseURL(window.location.protocol);
		return ConfigService.AUTH_ENDPOINT + api;
	}
	public static GetTokenValidateURL(): string {
		ConfigService.SetBaseURL(window.location.protocol);
		return this.AUTH_ENDPOINT;
	}
	public static GetAuthorizeEndpoint(): string {
		ConfigService.SetBaseURL(window.location.protocol);
		return this.AUTH_ENDPOINT + "authorize?sid=" + ConfigService.SERVICE_ID;
	}
	public static GetAccessToken(): string {
		if (sessionStorage.getItem("auth") != "") {
			const savedAuthDetails = JSON.parse(sessionStorage.getItem("auth"));
			if (savedAuthDetails != null) { ConfigService.SetAccessToken(savedAuthDetails.token); }
		}

		return this.ACCESS_TOKEN;
	}
	public static SetAPIEndpoint(endpoint: string) {
		this.API_ENDPOINT = endpoint;
	}
	public static SetAccessToken(token: string) { this.ACCESS_TOKEN = token; }
	private static SetBaseURL(protocol: string) {
		var s: string = window.location.hostname;
		if (s.startsWith("192") == false && s != "localhost") {
			var domain: string = s.substr(s.indexOf("."));
			ConfigService.API_ENDPOINT = protocol + "//" + "api" + domain;
			ConfigService.AUTH_ENDPOINT = ConfigService.API_ENDPOINT + "/trinity/";
		} else {
			ConfigService.API_ENDPOINT = protocol + "//api.frostdev.m";
			ConfigService.AUTH_ENDPOINT = "http://api.frostdev.m/trinity/";
		}
	}
}