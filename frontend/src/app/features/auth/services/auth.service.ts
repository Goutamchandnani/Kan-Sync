import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WebSocketService } from '../../board/services/websocket.service';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../../store/actions/auth.actions';

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'token';

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastrService,
    private socketService: WebSocketService,
    private store: Store
  ) {}

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: AuthResponse) => {
        localStorage.setItem('token', response.token);
        this.socketService.connect(response.token);
        this.router.navigate(['/boards']);
        this.toast.success('Login successful', 'KanSync');
      }),
      catchError((error) => {
        this.toast.error(error.error.message, 'KanSync');
        return throwError(() => error);
      })
    );
  }

  register(userData: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap((response: AuthResponse) => {
        console.log('Registration successful:', response); // Add this line
        localStorage.setItem('token', response.token);
        this.socketService.connect(response.token);
        this.router.navigate(['/boards']);
        this.toast.success('Signup successful', 'KanSync');
      }),
      catchError((error) => {
        this.toast.error(error.error.message, 'KanSync');
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.socketService.disconnect();
    this.router.navigate(['/auth/login']);
    this.store.dispatch(AuthActions.logoutSuccess());
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  googleLogin(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/google-login`, { token }).pipe(
      tap((response: AuthResponse) => {
        localStorage.setItem('token', response.token);
        this.socketService.connect(response.token);
        this.router.navigate(['/boards']);
        this.toast.success('Google login successful', 'KanSync');
      }),
      catchError((error) => {
        this.toast.error(error.error.message, 'KanSync');
        return throwError(() => error);
      })
    );
  }


  getCurrentUser(): Observable<User> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(shareReplay(1));
  }
}