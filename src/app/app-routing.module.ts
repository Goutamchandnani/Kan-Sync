import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { PublicBoardViewerComponent } from './features/board/components/public-board-viewer/public-board-viewer.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'boards',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'boards',
    loadChildren: () => import('./features/board/board.module').then(m => m.BoardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'public/board/:publicId',
    component: PublicBoardViewerComponent
  },
  {
    path: '**',
    redirectTo: 'boards'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }