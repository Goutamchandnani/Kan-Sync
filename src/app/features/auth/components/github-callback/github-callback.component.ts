import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../../../store/actions/auth.actions';

@Component({
  selector: 'app-github-callback',
  templateUrl: './github-callback.component.html',
  styleUrls: ['./github-callback.component.css']
})
export class GithubCallbackComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private store: Store
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      if (code) {
        this.authService.githubLogin(code).subscribe({
          next: (authResponse) => {
            console.log('GitHub login successful', authResponse);
            this.store.dispatch(AuthActions.loginSuccess({ response: authResponse }));
            this.router.navigate(['/boards']);
          },
          error: (error) => {
            console.error('GitHub login failed', error);
            this.store.dispatch(AuthActions.loginFailure({ error: error.message || 'GitHub login failed' }));
            this.router.navigate(['/auth/login']);
          }
        });
      } else {
        console.error('GitHub authorization code not found.');
        this.store.dispatch(AuthActions.loginFailure({ error: 'GitHub authorization code not found.' }));
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
