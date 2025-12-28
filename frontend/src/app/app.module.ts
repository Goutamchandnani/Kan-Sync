import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { ToastrModule } from 'ngx-toastr';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { boardReducer } from './store/reducers/board.reducer';
import { authReducer } from './store/reducers/auth.reducer';
import { BoardEffects } from './store/effects/board.effects';
import { AuthEffects } from './store/effects/auth.effects';
import { CoreModule } from './core/core.module';

@NgModule({
  declarations: [
  ],
  imports: [
    BrowserModule,

    AppRoutingModule,
    HttpClientModule,
    DragDropModule,
    FormsModule,
    ReactiveFormsModule,
    CoreModule,
    BrowserAnimationsModule, // required by ngx-toastr
    ToastrModule.forRoot(),  // registers the ToastrService provider


  ],
  providers: [

  ],

})
export class AppModule { }