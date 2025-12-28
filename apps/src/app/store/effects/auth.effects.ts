import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, exhaustMap, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../../features/auth/services/auth.service';
import * as AuthActions from '../actions/auth.actions';

@Injectable()
export class AuthEffects {

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(action =>
        this.authService.login(action.credentials).pipe(
          map(response => AuthActions.loginSuccess({ response })),
          catchError(error => {
            const errorMessage = error.error?.message || 'Invalid credentials';
            return of(AuthActions.loginFailure({ error: errorMessage }));
          })
        )
      )
    )
  );

  loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      tap(() => this.router.navigate(['/boards']))
    ),
    { dispatch: false }
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap(action =>
        this.authService.register(action.userData).pipe(
          map(response => AuthActions.registerSuccess({ response })),
          catchError(error => {
            const errorMessage = error.error?.message || 'Registration failed';
            return of(AuthActions.registerFailure({ error: errorMessage }));
          })
        )
      )
    )
  );

  registerSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.registerSuccess),
      tap(() => this.router.navigate(['/boards']))
    ),
    { dispatch: false }
  );

  googleRegister$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.googleRegister),
      exhaustMap(action =>
        this.authService.googleLogin(action.token).pipe(
          map(response => AuthActions.googleRegisterSuccess({ response })),
          catchError(error => {
            const errorMessage = error.error?.message || 'Google registration failed';
            return of(AuthActions.googleRegisterFailure({ error: errorMessage }));
          })
        )
      )
    )
  );

  googleRegisterSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.googleRegisterSuccess),
      tap(() => this.router.navigate(['/boards']))
    ),
    { dispatch: false }
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
      }),
      map(() => AuthActions.logoutSuccess())
    )
  );

  loadCurrentUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadCurrentUser),
      exhaustMap(() =>
        this.authService.getCurrentUser().pipe(
          map(user => {
            const token = this.authService.getToken();
            return AuthActions.loadCurrentUserSuccess({ user, token: token || '' });
          }),
          catchError(error => {
            const errorMessage = error.error?.message || 'Failed to load user data';
            return of(AuthActions.loadCurrentUserFailure({ error: errorMessage }));
          })
        )
      )
    )
  );

  loadCurrentUserFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadCurrentUserFailure),
      tap(() => {
        this.authService.logout();
        this.router.navigate(['/auth/login']);
      })
    ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private authService: AuthService,
    private router: Router
  ) {}
}