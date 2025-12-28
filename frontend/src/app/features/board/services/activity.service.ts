import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Activity } from '../../../core/models/activity.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly API_URL = `${environment.apiUrl}/boards`;

  constructor(private http: HttpClient) { }

  getActivities(boardId: string): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.API_URL}/${boardId}/activities`);
  }
}