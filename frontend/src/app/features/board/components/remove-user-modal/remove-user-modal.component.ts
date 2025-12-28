import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BoardService } from '../../services/board.service';
import { Board, BoardMember } from '../../models/board.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-remove-user-modal',
  templateUrl: './remove-user-modal.component.html',
  styleUrls: ['./remove-user-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class RemoveUserModalComponent implements OnInit {
  removeUserForm: FormGroup;
  boardMembers: BoardMember[] = []; // To store current board members

  constructor(
    public dialogRef: MatDialogRef<RemoveUserModalComponent>,
    private fb: FormBuilder,
    private boardService: BoardService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { boardId: string }
  ) {
    this.removeUserForm = this.fb.group({
      userId: ['', Validators.required] // Changed from email to userId for selection
    });
  }

  ngOnInit(): void {
    console.log('RemoveUserModalComponent initialized with boardId:', this.data.boardId);
    if (this.data.boardId) {
      console.log('Fetching board members for boardId:', this.data.boardId);
      this.boardService.getBoard(this.data.boardId).subscribe({
        next: (board: Board) => {
          console.log('Successfully fetched board:', board);
          console.log('Raw board members array:', board.members);
          this.boardMembers = board.members.filter((member: BoardMember) => member.role !== 'owner'); // Exclude owner from removal
          console.log('Filtered board members (excluding owner):', this.boardMembers);
          this.cdr.detectChanges(); // Manually trigger change detection
        },
        error: (error) => {
          console.error('Error fetching board members:', error);
          this.snackBar.open('Failed to load board members.', 'Close', { duration: 3000 });
          this.dialogRef.close();
        }
      });
    } else {
      console.error('No boardId provided to RemoveUserModalComponent');
      this.snackBar.open('No board ID available.', 'Close', { duration: 3000 });
      this.dialogRef.close();
    }
  }

  onRemoveUser(): void {
    if (this.removeUserForm.valid) {
      this.dialogRef.close(this.removeUserForm.value.userId);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
