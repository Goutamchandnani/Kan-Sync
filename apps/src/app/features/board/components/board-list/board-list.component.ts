import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { loadBoards, createBoard } from '../../../../store/actions/board.actions';
import { selectAllBoards, selectBoardLoading } from '../../../../store/selectors/board.selectors';
import { Board } from '../../models/board.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule
  ],
  template: `
    <div class="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="flex justify-between items-center mb-8">
          <div class="flex items-center">
            <h1 class="text-3xl font-bold text-gray-900">My Boards</h1>
            <button
              (click)="showCreateForm = true"
              class="ml-4 text-indigo-600 hover:text-indigo-900 text-lg font-medium"
            >
              Add New Board
            </button>
          </div>
          <button
            (click)="showCreateForm = true"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Create Board
          </button>
        </div>

        <!-- Create Board Form -->
        <div *ngIf="showCreateForm" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div class="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 class="text-xl font-semibold mb-4">Create New Board</h2>
            <form [formGroup]="createBoardForm" (ngSubmit)="onCreateBoard()">
              <div class="mb-4">
                <label for="title" class="block text-sm font-medium text-gray-700">Board Title</label>
                <input
                  type="text"
                  id="title"
                  formControlName="title"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter board title"
                />
              </div>
              <div class="flex items-center justify-between mt-6">
                <button
                  type="button"
                  (click)="showCreateForm = false"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="createBoardForm.invalid || (isLoading$ | async)"
                  class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Boards Grid -->
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div *ngFor="let board of boards$ | async" class="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg font-medium text-gray-900">{{ board.title }}</h3>
              <p class="mt-1 text-sm text-gray-500">
                {{ board.columns.length || 0 }} columns · {{ getTotalTasks(board) }} tasks
              </p>
            </div>
            <div class="px-4 py-4 sm:px-6">
              <div class="flex justify-between items-center">
                <div class="flex -space-x-2 overflow-hidden">
                  <ng-container *ngFor="let member of board.members.slice(0, 3)">
                    <img
                      [src]="member.avatar || 'assets/default-avatar.png'"
                      [alt]="member.name"
                      class="inline-block h-8 w-8 rounded-full ring-2 ring-white"
                    />
                  </ng-container>
                  <div *ngIf="(board.members?.length || 0) > 3" class="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 ring-2 ring-white">
                    <span class="text-xs font-medium text-gray-500">+{{ board.members!.length - 3 }}</span>
                  </div>
                </div>
                <a
                  [routerLink]="['/boards', board._id]"
                  [attr.href]="'/boards/' + board._id"
                  class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Open Board
                  <svg class="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div #bottomAnchor></div>
      </div>
    </div>
  `
})
export class BoardListComponent implements OnInit, AfterViewInit {
  @ViewChild('bottomAnchor') bottomAnchor!: ElementRef;
  boards$: Observable<Board[]>;
  isLoading$: Observable<boolean>;
  showCreateForm = false;
  createBoardForm: FormGroup;

  constructor(
    private store: Store,
    private fb: FormBuilder
  ) {
    this.boards$ = this.store.select(selectAllBoards);
    this.isLoading$ = this.store.select(selectBoardLoading);
    this.createBoardForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit() {
    this.store.dispatch(loadBoards());
  }

  ngAfterViewInit() {
    this.bottomAnchor.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  onCreateBoard() {
    if (this.createBoardForm.valid) {
      this.store.dispatch(createBoard({ title: this.createBoardForm.value.title }));
      this.showCreateForm = false;
      this.createBoardForm.reset();
    }
  }

  getTotalTasks(board: Board): number {
    return board.columns?.reduce((total, column) => total + (column.tasks?.length || 0), 0) || 0;
  }
}