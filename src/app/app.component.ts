import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import * as AuthActions from './store/actions/auth.actions';
import { AuthService } from './features/auth/services/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="min-h-screen bg-gray-50">
      <h1>{{ title }}</h1>
      <router-outlet></router-outlet>
    </div>
  `,
  standalone: true,
  imports: [RouterModule],
  styles: []
})
export class AppComponent implements OnInit {
  title = 'Task Board';

  constructor(private store: Store, private authService: AuthService) {}

  ngOnInit(): void {
    if (this.authService.getToken()) {
      this.store.dispatch(AuthActions.loadCurrentUser());
    }
  }
}