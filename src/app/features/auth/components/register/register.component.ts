import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as AuthActions from '../../../../store/actions/auth.actions';
import { selectAuthError, selectAuthLoading } from '../../../../store/selectors/auth.selectors';

declare const google: any;

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, AfterViewInit {
  registerForm: FormGroup;
  error$: Observable<string | null>;
  loading$: Observable<boolean>;

  constructor(
    private formBuilder: FormBuilder,
    private store: Store,
    private ngZone: NgZone
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.error$ = this.store.select(selectAuthError);
    this.loading$ = this.store.select(selectAuthLoading);
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
        { theme: 'outline', size: 'large', text: 'signup_with' }  // customization attributes
      );
    }
  }

  handleGoogleCredentialResponse(response: any): void {
    if (response.credential) {
      this.store.dispatch(AuthActions.googleRegister({ token: response.credential }));
    } else {
      console.error('Google credential not found in response.');
    }
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.store.dispatch(AuthActions.register({ userData: this.registerForm.value }));
    }
  }

  getErrorMessage(field: string): string {
    const control = this.registerForm.get(field);
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
