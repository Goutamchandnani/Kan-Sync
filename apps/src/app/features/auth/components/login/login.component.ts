import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as AuthActions from '../../../../store/actions/auth.actions';
import * as AuthSelectors from '../../../../store/selectors/auth.selectors';
import { AuthService } from '../../services/auth.service';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {
  loginForm: FormGroup;
  error$: Observable<string | null>;
  loading$: Observable<boolean>;

  constructor(
    private formBuilder: FormBuilder,
    private store: Store,
    private ngZone: NgZone,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.error$ = this.store.select(AuthSelectors.selectAuthError);
    this.loading$ = this.store.select(AuthSelectors.selectAuthLoading);
  }

  ngOnInit(): void {
    // Clear any existing errors when component initializes
    this.store.dispatch(AuthActions.clearAuthError());
  }

  ngAfterViewInit(): void {
    this.initializeGoogleSignIn();
  }

  initializeGoogleSignIn(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: '462443975571-blrmsem9olr54hs8ir4cs8m4fs9gvofq.apps.googleusercontent.com', // Replace with your actual client ID
        callback: (response: any) => this.ngZone.run(() => this.handleGoogleCredentialResponse(response))
      });

      google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large', text: 'signin_with' }  // customization attributes
      );
    }
  }

  handleGoogleCredentialResponse(response: any): void {
    if (response.credential) {
      this.authService.googleLogin(response.credential).subscribe({
        next: (authResponse) => {
          // Handle successful login, e.g., navigate to boards
          console.log('Google login successful', authResponse);
          this.store.dispatch(AuthActions.loginSuccess({ response: authResponse }));
        },
        error: (error) => {
          console.error('Google login failed', error);
          this.store.dispatch(AuthActions.loginFailure({ error: error.message || 'Google login failed' }));
        }
      });
    }
  }


  onSubmit(): void {
    if (this.loginForm.valid) {
      this.store.dispatch(AuthActions.login({ credentials: this.loginForm.value }));
    }
  }

  getErrorMessage(field: string): string {
    const control = this.loginForm.get(field);
    if (!control) return '';
    
    if (control.hasError('required')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    if (control.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control.hasError('minlength')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${control.errors?.['minlength'].requiredLength} characters`;
    }
    return '';
  }
}
