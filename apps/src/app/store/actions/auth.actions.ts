import { createAction, props } from '@ngrx/store';

// Login actions
export const login = createAction(
  '[Auth] Login',
  props<{ credentials: { email: string; password: string } }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ response: any }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

// Register actions
export const register = createAction(
  '[Auth] Register',
  props<{ userData: { name: string; email: string; password: string } }>()
);

export const registerSuccess = createAction(
  '[Auth] Register Success',
  props<{ response: any }>()
);

export const registerFailure = createAction(
  '[Auth] Register Failure',
  props<{ error: string }>()
);

// Google Register actions
export const googleRegister = createAction(
  '[Auth] Google Register',
  props<{ token: string }>()
);

export const googleRegisterSuccess = createAction(
  '[Auth] Google Register Success',
  props<{ response: any }>()
);

export const googleRegisterFailure = createAction(
  '[Auth] Google Register Failure',
  props<{ error: string }>()
);

// Logout actions
export const logout = createAction('[Auth] Logout');
export const logoutSuccess = createAction('[Auth] Logout Success');

// Load current user actions
export const loadCurrentUser = createAction('[Auth] Load Current User');

export const loadCurrentUserSuccess = createAction(
  '[Auth] Load Current User Success',
  props<{ user: any, token: string }>()
);

export const loadCurrentUserFailure = createAction(
  '[Auth] Load Current User Failure',
  props<{ error: string }>()
);

// Clear error action
export const clearAuthError = createAction('[Auth] Clear Error');